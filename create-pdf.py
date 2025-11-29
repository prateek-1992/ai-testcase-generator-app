#!/usr/bin/env python3
"""
Simple script to convert text PRD to PDF
"""
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    import sys

    def create_pdf(text_file, output_pdf):
        # Read text file
        with open(text_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Create PDF
        doc = SimpleDocTemplate(output_pdf, pagesize=letter)
        story = []
        
        # Define styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor='#1a1a1a',
            spaceAfter=12,
        )
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor='#2c3e50',
            spaceAfter=8,
        )
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=11,
            textColor='#333333',
            spaceAfter=6,
            leading=14,
        )
        
        # Split content into lines and process
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                story.append(Spacer(1, 6))
                continue
            
            # Detect headings (lines that are all caps or start with numbers)
            if (line.isupper() and len(line) > 5) or (line and line[0].isdigit() and '.' in line[:5]):
                if 'PRODUCT REQUIREMENTS' in line or 'PRD' in line.upper():
                    story.append(Paragraph(line, title_style))
                else:
                    story.append(Paragraph(line, heading_style))
            else:
                # Replace markdown-style formatting
                line = line.replace('**', '<b>').replace('**', '</b>')
                line = line.replace('- ', '&bull; ')
                story.append(Paragraph(line, normal_style))
        
        # Build PDF
        doc.build(story)
        print(f"PDF created successfully: {output_pdf}")

    if __name__ == "__main__":
        input_file = "sample-prd-enhanced.txt"
        output_file = "sample-prd-enhanced.pdf"
        create_pdf(input_file, output_file)

except ImportError:
    print("reportlab not installed. Installing...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "reportlab"])
    print("Please run this script again.")
except Exception as e:
    print(f"Error: {e}")
    print("\nTrying alternative method...")
    # Fallback: use a simpler approach
    try:
        from fpdf import FPDF
        import sys
        
        def create_pdf_simple(text_file, output_pdf):
            pdf = FPDF()
            pdf.set_auto_page_break(auto=True, margin=15)
            pdf.add_page()
            pdf.set_font("Arial", size=11)
            
            with open(text_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        # Handle long lines
                        if len(line) > 100:
                            pdf.multi_cell(0, 6, line)
                        else:
                            pdf.cell(0, 6, line, ln=1)
                    else:
                        pdf.ln(3)
            
            pdf.output(output_pdf)
            print(f"PDF created successfully: {output_pdf}")
        
        create_pdf_simple("sample-prd-enhanced.txt", "sample-prd-enhanced.pdf")
    except ImportError:
        print("Neither reportlab nor fpdf available.")
        print("Please install one: pip install reportlab OR pip install fpdf2")

