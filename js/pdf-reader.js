document.addEventListener('DOMContentLoaded', () => {
  const pdfjsLib = window['pdfjs-dist/build/pdf'];
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

  const fileInput = document.getElementById('fileInput');
  const canvas = document.getElementById('pdf-render');
  const ctx = canvas.getContext('2d');
  const gotoInput = document.getElementById('gotoPage');
  const btnGoto = document.getElementById('btnGoto');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const pageCounter = document.getElementById('pageCounter');

  let pdfDoc = null;
  let pageNum = 1;
  let currentFileKey = null;

  // Persistencia
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
    if (!pdfDoc) return;
    pdfDoc.getPage(num).then(page => {
      const containerWidth = Math.min(window.innerWidth * 0.9, 800);
      const viewport = page.getViewport({ scale: 1 });
      const scale = containerWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;

      page.render({ canvasContext: ctx, viewport: scaledViewport }).promise
        .then(() => {
          saveProgress(currentFileKey, num);
          gotoInput.value = num;
          pageCounter.textContent = `/ ${pdfDoc.numPages}`;
        })
        .catch(err => console.error('Error renderizando página:', err));
    }).catch(err => console.error('Error al obtener página:', err));
  }

  function changePage(offset) {
    if (!pdfDoc) return;
    pageNum += offset;
    if (pageNum < 1) pageNum = 1;
    if (pageNum > pdfDoc.numPages) pageNum = pdfDoc.numPages;
    renderPage(pageNum);
  }

  // Cargar PDF
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    currentFileKey = file.name;
    const savedPage = loadProgress(currentFileKey);

    const reader = new FileReader();
    reader.onload = function() {
      const typedarray = new Uint8Array(this.result);
      pdfjsLib.getDocument(typedarray).promise.then(pdf_ => {
        pdfDoc = pdf_;
        pageNum = Math.min(savedPage, pdfDoc.numPages);
        renderPage(pageNum);
      }).catch(err => console.error('Error al cargar PDF:', err));
    };
    reader.readAsArrayBuffer(file);
  });

  // Input ir a página
  btnGoto.addEventListener('click', () => {
    const gotoPage = parseInt(gotoInput.value);
    if (!pdfDoc || isNaN(gotoPage) || gotoPage < 1 || gotoPage > pdfDoc.numPages) return;
    pageNum = gotoPage;
    renderPage(pageNum);
  });

  // Botones avanzar/retroceder
  btnPrev.addEventListener('click', () => changePage(-1));
  btnNext.addEventListener('click', () => changePage(1));

  // Flechas teclado
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') changePage(-1);
    if (e.key === 'ArrowRight') changePage(1);
  });
});
