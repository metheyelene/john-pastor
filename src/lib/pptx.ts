import PptxGenJS from "pptxgenjs";
import type { SermonNote, Profile } from "../db";

// Build a PowerPoint file from a SermonNote. Returns a Blob the caller can trigger as a download.
// Layout: 16:9 widescreen, dark background (matches John's theme), warm-gold accents.

const SLIDE_BG = "0a0a23";
const SLIDE_FG = "f5f5fa";
const SLIDE_ACCENT = "ffb74d";
const SLIDE_SECONDARY = "ec407a";

function addBaseSlide(pptx: PptxGenJS, title?: string) {
  const slide = pptx.addSlide();
  slide.background = { color: SLIDE_BG };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.18, h: 7.5,
    fill: { color: SLIDE_ACCENT }, line: { color: SLIDE_ACCENT }
  });
  if (title) {
    slide.addText(title, {
      x: 0.5, y: 0.35, w: 12.3, h: 0.9,
      fontSize: 14, fontFace: "Inter", color: SLIDE_ACCENT,
      bold: true, charSpacing: 6
    });
  }
  return slide;
}

export async function exportSermonToPptx(note: SermonNote, profile?: Profile | null): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches (16:9)
  pptx.title = note.title;
  pptx.subject = note.scripture ?? "";
  pptx.company = profile?.churchName ?? "";
  pptx.author = profile?.pastorName ?? "John";

  // 1. Title slide
  const titleSlide = addBaseSlide(pptx);
  titleSlide.addText(profile?.churchName ?? "Church", {
    x: 0.7, y: 1.4, w: 11.6, h: 0.6,
    fontSize: 18, color: SLIDE_ACCENT, fontFace: "Inter", charSpacing: 4
  });
  titleSlide.addText(note.title, {
    x: 0.7, y: 2.0, w: 11.6, h: 2.6,
    fontSize: 54, color: SLIDE_FG, fontFace: "Inter", bold: true, valign: "middle"
  });
  titleSlide.addText(`${note.date}${note.scripture ? "  ·  " + note.scripture : ""}`, {
    x: 0.7, y: 5.0, w: 11.6, h: 0.5,
    fontSize: 18, color: SLIDE_SECONDARY, fontFace: "Inter", italic: true
  });
  if (profile?.pastorName) {
    titleSlide.addText(profile.pastorName, {
      x: 0.7, y: 6.4, w: 11.6, h: 0.4,
      fontSize: 14, color: SLIDE_FG, fontFace: "Inter",
      transparency: 30 // 30% transparent
    });
  }

  // 2. Scripture slide
  if (note.scripture) {
    const s = addBaseSlide(pptx, "SCRIPTURE");
    s.addText(note.scripture, {
      x: 0.7, y: 2.4, w: 11.6, h: 3.0,
      fontSize: 32, color: SLIDE_FG, fontFace: "Georgia", italic: true,
      align: "center", valign: "middle", lineSpacingMultiple: 1.5
    });
  }

  // 3. Intro slide
  if (note.intro) {
    const s = addBaseSlide(pptx, "INTRODUCTION");
    s.addText(note.intro, {
      x: 0.7, y: 1.4, w: 11.6, h: 5.5,
      fontSize: 22, color: SLIDE_FG, fontFace: "Inter",
      valign: "middle", lineSpacingMultiple: 1.4, fit: "shrink"
    });
  }

  // 4. Each point + illustration on its own slide
  (note.points ?? []).forEach((point, i) => {
    const illustration = note.illustrations?.[i];
    const s = addBaseSlide(pptx, `POINT ${i + 1}`);
    s.addText(point, {
      x: 0.7, y: illustration ? 1.6 : 2.4, w: 11.6, h: illustration ? 2.4 : 3.0,
      fontSize: 32, color: SLIDE_FG, fontFace: "Inter", bold: true,
      valign: "middle", lineSpacingMultiple: 1.3, fit: "shrink"
    });
    if (illustration) {
      s.addShape(pptx.ShapeType.line, {
        x: 0.7, y: 4.2, w: 11.6, h: 0,
        line: { color: SLIDE_ACCENT, width: 1 }
      });
      s.addText("Illustration", {
        x: 0.7, y: 4.3, w: 11.6, h: 0.4,
        fontSize: 12, color: SLIDE_ACCENT, fontFace: "Inter", bold: true, charSpacing: 4
      });
      s.addText(illustration, {
        x: 0.7, y: 4.75, w: 11.6, h: 2.4,
        fontSize: 18, color: SLIDE_FG, fontFace: "Inter", italic: true,
        valign: "top", lineSpacingMultiple: 1.4, fit: "shrink"
      });
    }
  });

  // 5. Application
  if (note.application) {
    const s = addBaseSlide(pptx, "APPLICATION");
    s.addText(note.application, {
      x: 0.7, y: 2.0, w: 11.6, h: 4.0,
      fontSize: 26, color: SLIDE_FG, fontFace: "Inter",
      valign: "middle", lineSpacingMultiple: 1.4, fit: "shrink"
    });
  }

  // 6. Closing
  if (note.closing) {
    const s = addBaseSlide(pptx, "CLOSING");
    s.addText(note.closing, {
      x: 0.7, y: 1.4, w: 11.6, h: 5.5,
      fontSize: 22, color: SLIDE_FG, fontFace: "Inter",
      valign: "middle", lineSpacingMultiple: 1.4, fit: "shrink"
    });
  }

  // 7. Closing prayer
  if (note.prayer) {
    const s = addBaseSlide(pptx, "CLOSING PRAYER");
    s.addText(note.prayer, {
      x: 0.7, y: 2.4, w: 11.6, h: 3.4,
      fontSize: 22, color: SLIDE_FG, fontFace: "Georgia", italic: true,
      valign: "middle", lineSpacingMultiple: 1.5, fit: "shrink"
    });
  }

  // Empty-note fallback
  if (!note.scripture && !note.intro && !(note.points?.length) && !note.application && !note.closing && !note.prayer) {
    const s = addBaseSlide(pptx, "EMPTY NOTE");
    s.addText("This sermon note is empty. Add sections in John, then re-export.", {
      x: 0.7, y: 3.0, w: 11.6, h: 1.5,
      fontSize: 22, color: SLIDE_FG, fontFace: "Inter", align: "center"
    });
  }

  return await pptx.write({ outputType: "blob" }) as Blob;
}

export async function downloadSermonAsPptx(note: SermonNote, profile?: Profile | null) {
  const blob = await exportSermonToPptx(note, profile);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = (note.title || "sermon").replace(/[^\w\-]+/g, "_").slice(0, 60);
  a.download = `${safeName}.pptx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
