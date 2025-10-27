document.addEventListener('DOMContentLoaded', () => {
  const pdfjsLib = window['pdfjs-dist/build/pdf'];
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

  let pdfDoc = null, pageNum = 1, pageRendering = false, pageNumPending = null, scale = 1.4;
  let currentFileKey = null;
  const canvas = document.getElementById('pdf-render');
  const ctx = canvas.getContext('2d');

  const fileInput = document.getElementById('fileInput');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const pageNumSpan = document.getElementById('page_num');
  const pageCountSpan = document.getElementById('page_count');

  // Persistencia con localStorage
  function getProgress() {
    return JSON.parse(localStorage.getItem('progresoPDF') || '{}');
  }
  function saveProgress(fileKey, page) {
    const data = getProgress();
    data[fileKey] = page;
    localStorage.setItem('progresoPDF', JSON.stringify(data));
  }
  function loadProgress(fileKey) {
    const data = getProgress();
    return data[fileKey] || 1;
  }

  function renderPage(num) {
    pageRendering = true;
    pdfDoc.getPage(num).then(page => {
      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderTask = page.render({ canvasContext: ctx, viewport });
      renderTask.promise.then(() => {
        pageRendering = false;
        pageNumSpan.textContent = num;
        saveProgress(currentFileKey, num);
        if (pageNumPending !== null) {
          renderPage(pageNumPending);
          pageNumPending = null;
        }
      });
    });
  }

  function queueRenderPage(num) {
    if (pageRendering) pageNumPending = num;
    else renderPage(num);
  }

  prevBtn.addEventListener('click', () => {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
  });

  nextBtn.addEventListener('click', () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    currentFileKey = file.name;
    const savedPage = loadProgress(currentFileKey);

    const reader = new FileReader();
    reader.onload = function() {
      const typedarray = new Uint8Array(this.result);
      pdfjsLib.getDocument(typedarray).promise.then(pdfDoc_ => {
        pdfDoc = pdfDoc_;
        pageCountSpan.textContent = pdfDoc.numPages;
        pageNum = Math.min(savedPage, pdfDoc.numPages);
        renderPage(pageNum);
      });
    };
    reader.readAsArrayBuffer(file);
  });
});
