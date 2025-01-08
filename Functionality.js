// Wrap in IIFE to avoid global scope pollution
(function() {
  // DOM Elements
  const inputTextarea = document.getElementById('conversation-input');
  const previewContainer = document.getElementById('conversation-preview');
  const outputTextarea = document.getElementById('html-output');

  // Utility function to sanitize HTML to prevent XSS
  function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  }

  function formatContent(content) {
    const lines = content.split('\n');
    let inList = false;
    const formattedLines = [];

    lines.forEach(line => {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        if (inList) {
          formattedLines.push('</ul>');
          inList = false;
        }
        return;
      }

      // Handle headers
      if (trimmedLine.startsWith('<#>')) {
        if (inList) {
          formattedLines.push('</ul>');
          inList = false;
        }
        const headerText = sanitizeHTML(trimmedLine.replace('<#>', '').trim());
        formattedLines.push(`<h3 class="font-semibold text-lg mb-3 mt-4">${headerText}</h3>`);
        return;
      }

      // Handle bullet points
      if (trimmedLine.startsWith('<-->')) {
        const bulletText = sanitizeHTML(trimmedLine.replace('<-->', '').trim());
        if (!inList) {
          inList = true;
          formattedLines.push('<ul class="list-disc pl-6 mb-4">');
        }
        formattedLines.push(`<li class="mb-2">${bulletText}</li>`);
        return;
      }

      // Handle regular text
      if (inList) {
        formattedLines.push('</ul>');
        inList = false;
      }
      formattedLines.push(`<p class="mb-3">${sanitizeHTML(trimmedLine)}</p>`);
    });

    if (inList) {
      formattedLines.push('</ul>');
    }

    return formattedLines.join('\n');
  }

  function parseConversation(text) {
    const messages = [];
    const blocks = text.split(/\n\s*B\s*\n/);

    blocks.forEach(block => {
      if (!block.trim()) return;
      const startParts = block.split(/<\|start\|\>/);

      if (startParts[0]) {
        let humanContent = startParts[0]
          .replace(/^B\s+/, '')
          .replace(/\s*Edit\s*$/, '')
          .trim();

        if (humanContent) {
          messages.push({
            type: 'human',
            content: formatContent(humanContent)
          });
        }
      }

      if (startParts[1]) {
        let assistantContent = startParts[1]
          .split(/<\|end\|\>/)[0]
          .replace(/\s*(Copy|Retry|Edit)\s*/g, '')
          .replace(/Claude does not have internet.*$/gm, '')
          .trim();

        if (assistantContent) {
          messages.push({
            type: 'assistant',
            content: formatContent(assistantContent)
          });
        }
      }
    });

    return messages;
  }

  function generateHtml(messages) {
    const html = `
      <div class="chat-container">
        ${messages.map(msg => `
          <div class="message ${msg.type}">
            <div class="avatar ${msg.type}">
              ${msg.type === 'human' ? 'Human' : 'AI Assistant'}
            </div>
            <div class="message-content">
              ${msg.content}
            </div>
          </div>
        `).join('')}
      </div>
    `.trim();
    return html;
  }

  function handleInput() {
    const text = inputTextarea.value;
    const messages = parseConversation(text);
    const html = generateHtml(messages);

    previewContainer.innerHTML = html;
    outputTextarea.value = html;
  }

  // Copy to Clipboard Function
  function copyToClipboard() {
    const outputTextarea = document.getElementById('html-output');

    // Select the text
    outputTextarea.select();
    outputTextarea.setSelectionRange(0, 99999); // For mobile devices

    // Copy the text
    try {
      const successful = document.execCommand('copy');
      const msg = successful ? 'Copied!' : 'Copy failed';

      // Provide visual feedback
      outputTextarea.style.backgroundColor = successful ? '#e6f3ff' : '#ffebee';
      setTimeout(() => {
        outputTextarea.style.backgroundColor = '';
      }, 300);
    } catch (err) {
      console.error('Unable to copy', err);
    }
  }

  // Accordion functionality
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      header.classList.toggle('open');
      const content = header.nextElementSibling;
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });

  // Event Listeners
  inputTextarea.addEventListener('input', handleInput);
})();
