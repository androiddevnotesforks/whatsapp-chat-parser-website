import JSZip from 'jszip';
import { parseString } from 'whatsapp-chat-parser';

const getMimeType = fileName => {
  if (/\.jpe?g$/.test(fileName)) return 'image/jpeg';
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.gif')) return 'image/gif';
  if (fileName.endsWith('.webp')) return 'image/webp';
  if (fileName.endsWith('.svg')) return 'image/svg+xml';

  if (fileName.endsWith('.mp4')) return 'video/mp4';
  if (fileName.endsWith('.webm')) return 'video/webm';

  if (fileName.endsWith('.mp3')) return 'audio/mpeg';
  if (fileName.endsWith('.m4a')) return 'audio/mp4';
  if (fileName.endsWith('.wav')) return 'audio/wav';
  if (fileName.endsWith('.opus')) return 'audio/ogg';

  return null;
};

const showError = (message, err) => {
  console.error(err || message); // eslint-disable-line no-console
  alert(message); // eslint-disable-line no-alert
};

const readChatFile = zipData => {
  const chatFile = zipData.file('_chat.txt');

  if (chatFile) return chatFile.async('string');

  const chatFiles = zipData.file(/.*(?:chat|whatsapp).*\.txt$/i);

  if (!chatFiles.length) {
    return Promise.reject(new Error('No txt files found in archive'));
  }

  const chatFilesSorted = chatFiles.sort(
    (a, b) => a.name.length - b.name.length,
  );

  return chatFilesSorted[0].async('string');
};

const replaceEncryptionMessageAuthor = messages =>
  messages.map((message, i) => {
    if (i < 10 && message.message.includes('end-to-end')) {
      return { ...message, author: null };
    }
    return message;
  });

const extractFile = file => {
  if (!file) return null;
  if (typeof file === 'string') return file;

  const jszip = new JSZip();

  return jszip.loadAsync(file);
};

const fileToText = file => {
  if (!file) return Promise.resolve('');
  if (typeof file === 'string') return Promise.resolve(file);

  return readChatFile(file).catch(err => {
    // eslint-disable-next-line no-alert
    alert(err);
    return Promise.resolve('');
  });
};

function messagesFromFile(file) {
  return fileToText(file).then(text =>
    replaceEncryptionMessageAuthor(
      parseString(text, { parseAttachments: file instanceof JSZip }).map(
        (msg, index) => ({ ...msg, index }),
      ),
    ),
  );
}

function participantsFromMessages(messages) {
  const set = new Set();

  messages.forEach(m => {
    if (m.author) set.add(m.author);
  });

  return Array.from(set);
}

function getISODateString(date) {
  return date.toISOString().slice(0, 10);
}

function extractStartEndDatesFromMessages(messages) {
  const start = messages[0]?.date ?? new Date();
  const end = messages.at(-1)?.date ?? new Date();

  return { start, end };
}

function convertDateInputStringIntoDate(startOrEnd, dateInputString) {
  const [year, month, day] = dateInputString.split('-').map(i => +i);

  if (startOrEnd === 'start') {
    const tmp = new Date(year, month - 1, day - 1);
    return new Date(tmp.valueOf() + 1);
  }

  const tmp = new Date(year, month - 1, day + 1);
  return new Date(tmp.valueOf() - 1);
}

function filterMessagesByDate(messages, startDate, endDate) {
  return messages.filter(message => {
    const date = new Date(message.date);
    return (
      date.valueOf() >= startDate.valueOf() &&
      date.valueOf() <= endDate.valueOf()
    );
  });
}

export {
  getMimeType,
  showError,
  readChatFile,
  replaceEncryptionMessageAuthor,
  extractFile,
  fileToText,
  messagesFromFile,
  participantsFromMessages,
  getISODateString,
  extractStartEndDatesFromMessages,
  convertDateInputStringIntoDate,
  filterMessagesByDate,
};
