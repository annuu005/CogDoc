import os
import spacy
import re
from sentence_transformers import SentenceTransformer, CrossEncoder
from pypdf import PdfReader
import json

# Try to import python-docx for Word files
try:
    import docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False
    print("⚠️ IMPORT ERROR: Could not load python-docx. Word file support disabled.")

# Try to import local LLM
try:
    from llama_cpp import Llama
    HAS_LOCAL_LLM = True
except ImportError as e:
    print(f"⚠️ IMPORT ERROR: Could not load llama-cpp-python. Details: {e}")
    HAS_LOCAL_LLM = False


class LegalAI:
    def __init__(self):
        print("Initializing Offline AI Engine...")

        # 1. Load NLP for segmentation
        print("Loading spaCy...")
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except Exception:
            os.system("python -m spacy download en_core_web_sm")
            self.nlp = spacy.load("en_core_web_sm")

        # 2. Load Sentence Embeddings
        print("Loading Embedding Model...")
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")

        # 3. Load NLI / Contradiction Engine
        print("Loading Consistency Engine (DeBERTa-v3-small)...")
        self.consistency_model = CrossEncoder("cross-encoder/nli-deberta-v3-small")

        # 4. Load Offline LLM
        model_path = "mistral-7b-instruct-v0.2.Q4_K_M.gguf"

        if HAS_LOCAL_LLM and os.path.exists(model_path):
            print(f"Loading Local LLM from {model_path}...")
            self.llm = Llama(
                model_path=model_path,
                n_ctx=4096,
                n_gpu_layers=0,  # Set to 35 if you have an NVIDIA GPU
                verbose=False
            )
            self.mode = "REAL_OFFLINE"
        else:
            if not os.path.exists(model_path):
                print(f"❌ ERROR: Model file NOT found at: {os.path.abspath(model_path)}")
            elif not HAS_LOCAL_LLM:
                print("❌ ERROR: 'llama-cpp-python' library is missing.")
                print("   → Run: pip install llama-cpp-python")
            print("WARNING: Local LLM not found. Running in SIMULATION mode.")
            self.mode = "SIMULATION"

    # ─────────────────────────────────────────
    # TEXT UTILITIES
    # ─────────────────────────────────────────

    def clean_text(self, text):
        """Fixes common PDF extraction artifacts."""
        def replacer(match):
            return match.group(0).replace(" ", "")
        text = re.sub(r"(\b\w \w \w+(?: \w)*\b)", replacer, text)
        text = re.sub(r"\s+", " ", text)
        text = text.encode("ascii", "ignore").decode("ascii")
        return text.strip()

    def extract_text_from_pdf(self, file_path):
        try:
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
            return self.clean_text(text)
        except Exception as e:
            print(f"Error reading PDF: {e}")
            return ""

    def extract_text_from_docx(self, file_path):
        if not HAS_DOCX:
            print("❌ python-docx not installed. Cannot process .docx files.")
            return ""
        try:
            doc = docx.Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
            return self.clean_text(text)
        except Exception as e:
            print(f"Error reading DOCX: {e}")
            return ""

    def extract_text_from_txt(self, file_path):
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
            return self.clean_text(text)
        except Exception as e:
            print(f"Error reading TXT: {e}")
            return ""

    # ─────────────────────────────────────────
    # AI ANALYSIS
    # ─────────────────────────────────────────

    def segment_clauses(self, full_text):
        doc = self.nlp(full_text)
        return [sent.text.strip() for sent in doc.sents if len(sent.text) > 30]

    def analyze_risk(self, clause_text):
        """Uses LLM to identify clause risk level."""
        if self.mode == "SIMULATION":
            lower = clause_text.lower()
            if "indemnify" in lower:
                return {"risk": "High", "reason": "Uncapped indemnity obligation detected."}
            if "termination" in lower:
                return {"risk": "Medium", "reason": "Termination clause requires review."}
            return {"risk": "Low", "reason": "Standard operational clause."}

        prompt = f"""[INST] You are a legal AI. Analyze this contract clause for risk (High/Medium/Low) and explain why in one short sentence.

Clause: "{clause_text}"

Return ONLY valid JSON in this format: {{"risk": "Level", "reason": "Explanation"}}
[/INST]"""

        try:
            response = self.llm(prompt, max_tokens=150, stop=["}"])
            output = response["choices"][0]["text"]
            start = output.find("{")
            if start != -1:
                output = output[start:] + "}"
                output = output.replace("}}", "}")
                return json.loads(output)
            return {"risk": "Review", "reason": "AI output format error."}
        except Exception as e:
            print(f"LLM Error: {e}")
            return {"risk": "Review", "reason": "Complex clause requires manual check."}

    def check_contradictions(self, clauses):
        """Checks for logical inconsistencies using NLI model."""
        contradictions = []
        checklist = clauses[:10]

        for i, c1 in enumerate(checklist):
            for j, c2 in enumerate(checklist):
                if i >= j:
                    continue
                scores = self.consistency_model.predict([(c1, c2)])
                # --- NEW PRINT STATEMENT HERE ---
                print(f"  → Cross-checking Clause {i+1} & {j+1} (Match Confidence: {scores[0][scores.argmax()]:.2f})")
                pred_label = scores.argmax()
                if pred_label == 0 and scores[0][0] > 0.8:
                    contradictions.append({
                        "id": f"{i}-{j}",
                        "title": "Logical Inconsistency",
                        "sourceA": f"Clause {i + 1}",
                        "sourceB": f"Clause {j + 1}",
                        "aiAnalysis": (
                            f"The model detected a contradiction between "
                            f"Clause {i + 1} and Clause {j + 1}."
                        )
                    })

        return contradictions

    def get_embedding(self, text):
        return self.embedder.encode(text).tolist()

    # ─────────────────────────────────────────
    # FEATURE 1 — PDF REPORT GENERATION
    # ─────────────────────────────────────────

    def generate_pdf_report(self, result: dict, output_path: str) -> str:
        """
        Generates a structured PDF report from analysis results.
        Saves to output_path and returns the path.
        Uses reportlab — install with: pip install reportlab
        """
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer,
            Table, TableStyle, HRFlowable
        )
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
        import datetime

        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=2 * cm, leftMargin=2 * cm,
            topMargin=2 * cm,   bottomMargin=2 * cm
        )

        styles = getSampleStyleSheet()

        # ── Custom paragraph styles ──────────────────────────────────
        title_style = ParagraphStyle(
            "ReportTitle", parent=styles["Heading1"],
            fontSize=20, textColor=colors.HexColor("#1e3a5f"),
            spaceAfter=6, alignment=TA_CENTER
        )
        section_style = ParagraphStyle(
            "Section", parent=styles["Heading2"],
            fontSize=13, textColor=colors.HexColor("#1e3a5f"),
            spaceBefore=14, spaceAfter=6
        )
        body_style = ParagraphStyle(
            "Body", parent=styles["Normal"],
            fontSize=9, leading=14, textColor=colors.HexColor("#333333")
        )
        meta_style = ParagraphStyle(
            "Meta", parent=styles["Normal"],
            fontSize=8, textColor=colors.HexColor("#666666"),
            alignment=TA_CENTER
        )

        risk_colors = {
            "High":     colors.HexColor("#dc2626"),
            "Medium":   colors.HexColor("#ea580c"),
            "Low":      colors.HexColor("#16a34a"),
            "Critical": colors.HexColor("#7c3aed"),
            "Review":   colors.HexColor("#ca8a04"),
        }

        story = []

        # ── HEADER ───────────────────────────────────────────────────
        story.append(Paragraph("CogDoc — Legal Document Intelligence Report", title_style))
        story.append(Paragraph(
            f"Generated: {datetime.datetime.now().strftime('%B %d, %Y at %H:%M')}  |  "
            f"Document: <b>{result.get('fileName', 'Unknown')}</b>",
            meta_style
        ))
        story.append(HRFlowable(
            width="100%", thickness=1,
            color=colors.HexColor("#e2e8f0"), spaceAfter=14
        ))

        # ── EXECUTIVE SUMMARY TABLE ───────────────────────────────────
        story.append(Paragraph("Executive Summary", section_style))

        overall_risk = result.get("riskLevel", "Low")
        risk_color = risk_colors.get(overall_risk, colors.grey)

        summary_data = [
            ["Metric",           "Value"],
            ["Overall Risk Level", overall_risk],
            ["Risk Score",        str(result.get("riskScore", 0))],
            ["Total Clauses",     str(result.get("totalClauses", 0))],
            ["Flagged Clauses",   str(result.get("flaggedClauses", 0))],
            ["Contradictions",    str(len(result.get("contradictions", [])))],
        ]

        summary_table = Table(summary_data, colWidths=[8 * cm, 8 * cm])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),  # header row
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 9),
            # Alternating row backgrounds for rows 1 onwards
            ("ROWBACKGROUNDS", (0, 1), (-1, -1),
             [colors.HexColor("#f8fafc"), colors.white]),
            # Risk color cell — MUST come AFTER ROWBACKGROUNDS to override it
            ("BACKGROUND",    (1, 1), (1, 1),  risk_color),
            ("TEXTCOLOR",     (1, 1), (1, 1),  colors.white),
            ("FONTNAME",      (1, 1), (1, 1),  "Helvetica-Bold"),
            ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("ALIGN",         (0, 0), (-1, -1), "LEFT"),
            ("PADDING",       (0, 0), (-1, -1), 8),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 0.4 * cm))

        # ── CLAUSE-BY-CLAUSE ANALYSIS ─────────────────────────────────
        story.append(Paragraph("Clause-by-Clause Risk Analysis", section_style))

        clauses = result.get("results", result.get("analysis", []))
        for i, clause in enumerate(clauses):
            risk_val = clause.get("risk", "Low")
            c_color  = risk_colors.get(risk_val, colors.grey)

            # Convert hex color to string for inline use
            try:
                hex_str = c_color.hexval()  # e.g. '#dc2626'
            except Exception:
                hex_str = "#333333"

            clause_text = clause.get("text", "")[:500]  # cap at 500 chars
            reason_text = clause.get("reason", "N/A")

            clause_data = [
                [
                    Paragraph(f"<b>Clause {i + 1}</b>", body_style),
                    Paragraph(
                        f'<font color="{hex_str}"><b>{risk_val} Risk</b></font>',
                        body_style
                    )
                ],
                [Paragraph(clause_text, body_style), ""],
                [Paragraph(f"<i>AI Reasoning: {reason_text}</i>", body_style), ""],
            ]

            clause_table = Table(clause_data, colWidths=[13 * cm, 3.5 * cm])
            clause_table.setStyle(TableStyle([
                ("SPAN",       (0, 1), (-1, 1)),
                ("SPAN",       (0, 2), (-1, 2)),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("LINEABOVE",  (0, 0), (-1, 0), 1.5, c_color),
                ("FONTSIZE",   (0, 0), (-1, -1), 8),
                ("GRID",       (0, 0), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
                ("PADDING",    (0, 0), (-1, -1), 6),
                ("VALIGN",     (0, 0), (-1, -1), "TOP"),
            ]))
            story.append(clause_table)
            story.append(Spacer(1, 0.15 * cm))

        # ── CONTRADICTIONS ────────────────────────────────────────────
        contradictions = result.get("contradictions", [])
        if contradictions:
            story.append(Paragraph("Contradiction & Consistency Findings", section_style))
            for c in contradictions:
                text = (
                    f"<b>{c.get('title', 'Inconsistency')}</b> — "
                    f"{c.get('sourceA', '')} vs {c.get('sourceB', '')}: "
                    f"{c.get('aiAnalysis', '')}"
                )
                story.append(Paragraph(text, body_style))
                story.append(Spacer(1, 0.15 * cm))

        # ── FOOTER ───────────────────────────────────────────────────
        story.append(HRFlowable(
            width="100%", thickness=1,
            color=colors.HexColor("#e2e8f0"), spaceBefore=20
        ))
        story.append(Paragraph(
            "This report was generated by CogDoc Offline AI. "
            "It is for informational purposes only and does not constitute legal advice.",
            meta_style
        ))

        doc.build(story)
        return output_path


# ── Singleton — loaded ONCE at startup, shared across all requests ────────────
ai_engine = LegalAI()