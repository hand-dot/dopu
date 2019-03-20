const fs = require("fs");
const puppeteer = require("puppeteer");

const docsURL = "https://ja.reactjs.org/docs/";

const mkdir = dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};

// スタイルの微調整をしつつ、PDFを作る
const createPdf = (item, content, isLast, index, page, browser) => {
  return new Promise(async resolve => {
    await page.goto(`${docsURL}${item}.html`);
    // スタイルの微調整
    await page.evaluate(({}) => {
      const paginationCss = ".css-uygc5k";
      const sideNavCss = ".css-1kbu8hg";
      const contentText = ".css-7u1i3w p";
      document.getElementsByTagName("header")[0].style.display = "none";
      document.getElementsByTagName("footer")[0].style.display = "none";
      document.querySelector(sideNavCss).style.display = "none";
      document.querySelectorAll(contentText).forEach(p => {
        p.style.maxWidth = "100%";
        p.style.marginTop = "0px";
      });
      const pagination = document.querySelector(paginationCss);
      if (pagination) pagination.style.display = "none";
    }, {});
    // ここまでー
    mkdir(`pdf/${content}`);
    await page.pdf({
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size: 10px; margin-left: 40px;"><span>${content}</span> / <span class="title"></span> / <span class="date"></span></div>`,
      margin: { top: 50, bottom: 50 },
      scale: 0.5,
      path: `pdf/${content}/${index}-${item}.pdf`
    });
    if (isLast) {
      browser.close();
      console.log("PDF出力完了");
    }
    resolve();
  });
};

// サイドバーの見出しからページの一覧を取得する {見出し: [ページ1, ページ2 ...]} みたいな感じで返す
const createTarget = async page => {
  await page.goto(`${docsURL}getting-started.html`);
  return await page.evaluate(({}) => {
    const contentsCss = ".css-1j8jxus";
    return Array.prototype.reduce.call(
      document.querySelectorAll(contentsCss),
      (acc, elem) =>
        Object.assign(acc, {
          [elem.getElementsByTagName("div")[0]
            .innerText]: Array.prototype.map.call(
            elem.nextElementSibling.children,
            children =>
              children
                .getElementsByTagName("a")[0]
                .href.replace("https://ja.reactjs.org/docs/", "")
                .replace(".html", "")
          )
        }),
      {}
    );
  }, {});
};

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  mkdir("pdf");
  const target = await createTarget(page);
  let promise = Promise.resolve();
  const contents = Object.keys(target);
  contents.forEach((content, index) => {
    const items = target[content];
    const isLastContent = index + 1 === contents.length;
    items.forEach((item, _index) => {
      const isLastItem = _index + 1 === items.length;
      const isLast = isLastContent && isLastItem;
      promise = promise.then(() =>
        createPdf(item, content, isLast, _index, page, browser)
      );
    });
  });
})();
