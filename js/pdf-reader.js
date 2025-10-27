document.addEventListener('DOMContentLoaded', () => {
  const pdfjsLib = window['pdfjs-dist/build/pdf'];
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

  const fileInput = document.getElementById('fileInput');
  const canvas = document.getElementById('pdf-render');
  const ctx = canvas.getContext('2d');
  const gotoInput = document.getElementById('gotoPage');
  const btnGoto = document.getElementById('btnGoto');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const pageCounter = document.getElementById('pageCounter');

  // Crear spinner
  const spinner = document.createElement('div');
  spinner.id = 'spinner';
  spinner.textContent = 'Cargando PDF...';
  spinner.style.position = 'fixed';
  spinner.style.top = '50%';
  spinner.style.left = '50%';
  spinner.style.transform = 'translate(-50%, -50%)';
  spinner.style.padding = '1rem 2rem';
  spinner.style.background = '#f0a500';
  spinner.style.color = '#1a1a2e';
  spinner.style.borderRadius = '12px';
  spinner.style.fontWeight = '600';
  spinner.style.display = 'none';
  document.body.appendChild(spinner);

  let pdfDoc = null;
  let pageNum = 1;
  let currentFileKey = null;
  let rendering = false;

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

  // Renderizar página
  function renderPage(num) {
    if (!pdfDoc || rendering) return;
    rendering = true;
    spinner.style.display = 'block';

    pdfDoc.getPage(num).then(page => {
      // Escala adaptativa y ligera
      const containerWidth = Math.min(window.innerWidth * 0.9, 800);
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(containerWidth / viewport.width, 0.9);
      const scaledViewport = page.getViewport({ scale });

      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;

      page.render({ canvasContext: ctx, viewport: scaledViewport }).promise
        .then(() => {
          pageNum = num;
          saveProgress(currentFileKey, num);
          gotoInput.value = num;
          pageCounter.textContent = `/ ${pdfDoc.numPages}`;
        })
        .finally(() => {
          rendering = false;
          spinner.style.display = 'none';
        });
    }).catch(err => {
      console.error('Error al renderizar página:', err);
      rendering = false;
      spinner.style.display = 'none';
    });
  }

  // Cambiar página
  function changePage(offset) {
    if (!pdfDoc || rendering) return;
    let newPage = pageNum + offset;
    if (newPage < 1) newPage = 1;
    if (newPage > pdfDoc.numPages) newPage = pdfDoc.numPages;
    renderPage(newPage);
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
      pdfjsLib.getDocument(typedarray).promise
        .then(pdf_ => {
          pdfDoc = pdf_;
          renderPage(Math.min(savedPage, pdfDoc.numPages));
        })
        .catch(err => {
          console.error('Error al cargar PDF:', err);
          alert('No se pudo cargar el PDF. Intenta con otro archivo.');
        });
    };
    reader.readAsArrayBuffer(file);
  });

  // Input ir a página
  btnGoto.addEventListener('click', () => {
    const gotoPage = parseInt(gotoInput.value);
    if (!pdfDoc || isNaN(gotoPage) || gotoPage < 1 || gotoPage > pdfDoc.numPages) return;
    renderPage(gotoPage);
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
