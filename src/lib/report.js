export function printReport(htmlContent) {
  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @font-face {
          font-family: 'Kalpurush';
          src: url('/fonts/Kalpurush.ttf') format('truetype');
        }
        * { font-family: 'Kalpurush', sans-serif; }
        body { margin: 2cm; font-size: 12pt; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #333; padding: 6px 10px; }
        th { background: #f0f0f0; }
        @media print {
          @page { size: A4; margin: 2cm; }
        }
      </style>
    </head>
    <body>${htmlContent}</body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}
