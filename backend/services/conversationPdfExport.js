import { PDFDocument, StandardFonts } from 'pdf-lib';

const PAGE_MARGIN = 50;
const TITLE_SIZE = 16;
const BODY_SIZE = 11;
const LINE_HEIGHT = 14;
const SECTION_GAP = 8;

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('fr-FR');
  } catch {
    return String(value);
  }
};

const sanitizeText = (value) => String(value || '').replace(/[^\x00-\xFF]/g, '');

const wrapText = (text, font, size, maxWidth) => {
  const paragraphs = sanitizeText(text).split('\n');
  const lines = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let currentLine = words[0];
    for (let i = 1; i < words.length; i += 1) {
      const candidate = `${currentLine} ${words[i]}`;
      const candidateWidth = font.widthOfTextAtSize(candidate, size);
      if (candidateWidth <= maxWidth) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
  }

  return lines;
};

export async function generateConversationPdf(conversation, messages, options = {}) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let page = pdfDoc.addPage();
  let { width, height } = page.getSize();
  let cursorY = height - PAGE_MARGIN;

  const ensureSpace = () => {
    if (cursorY < PAGE_MARGIN + LINE_HEIGHT) {
      page = pdfDoc.addPage();
      ({ width, height } = page.getSize());
      cursorY = height - PAGE_MARGIN;
    }
  };

  const drawLine = (text, size = BODY_SIZE, indent = 0) => {
    ensureSpace();
    page.drawText(text, {
      x: PAGE_MARGIN + indent,
      y: cursorY,
      size,
      font
    });
    cursorY -= LINE_HEIGHT;
  };

  const drawWrapped = (text, size = BODY_SIZE, indent = 0) => {
    const maxWidth = width - PAGE_MARGIN * 2 - indent;
    const lines = wrapText(text, font, size, maxWidth);
    for (const line of lines) {
      drawLine(line, size, indent);
    }
  };

  const contactLabel = sanitizeText(conversation?.contact_name || conversation?.contact_number || 'Contact');
  const agentLabel = sanitizeText(conversation?.agent_name || 'Agent');

  drawLine(`Conversation avec ${contactLabel}`, TITLE_SIZE);
  cursorY -= SECTION_GAP;
  drawLine(`Agent: ${agentLabel}`);
  drawLine(`Debut: ${formatDate(conversation?.created_at)}`);
  if (conversation?.last_message_at) {
    drawLine(`Dernier message: ${formatDate(conversation.last_message_at)}`);
  }
  if (options.messagesTotal && options.messagesTotal > messages.length) {
    drawLine(`Messages exportes: ${messages.length}/${options.messagesTotal}`);
  }
  cursorY -= SECTION_GAP;

  for (const message of messages) {
    const timestamp = formatDate(message.created_at);
    const roleLabel = message.role === 'user' ? 'Client' : 'Assistant';
    drawLine(`${timestamp} — ${roleLabel}:`);

    let content = sanitizeText(message.content || '');
    if (message.message_type && message.message_type !== 'text') {
      const typeLabel = message.message_type.toUpperCase();
      content = content ? `${content} [${typeLabel}]` : `[${typeLabel}]`;
    }

    drawWrapped(content, BODY_SIZE, 12);
    cursorY -= SECTION_GAP;
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
