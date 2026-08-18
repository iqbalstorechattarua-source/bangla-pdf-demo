const express=require("express");
const path=require("path");

process.env.PUPPETEER_CACHE_DIR=path.join(__dirname,".cache","puppeteer");

const puppeteer=require("puppeteer");
const QRCode=require("qrcode");
const path=require("path");

const app=express();
const PORT=process.env.PORT||3000;

app.use(express.json({limit:"10mb"}));
app.use(express.static(path.join(__dirname,"public")));

app.post("/generate-pdf",async(req,res)=>{
  let browser;
  try{
    const d=req.body;
    if(!d.name) return res.status(400).json({error:"নাম প্রয়োজন"});

    const id=d.applicationId||"APP-"+Date.now();
    const baseUrl=process.env.BASE_URL||`http://localhost:${PORT}`;
    const verifyUrl=`${baseUrl}/verify.html?id=${encodeURIComponent(id)}`;

    const qr=await QRCode.toDataURL(verifyUrl,{
      width:500,margin:2,errorCorrectionLevel:"H"
    });

    const html=makeHTML({...d,applicationId:id,qrDataUrl:qr});

    browser=await puppeteer.launch({
  headless:true,
  executablePath:puppeteer.executablePath(),
  args:[
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage"
  ]
});

    const page=await browser.newPage();

    await page.setViewport({
      width:1240,height:1754,deviceScaleFactor:2
    });

    await page.setContent(html,{waitUntil:"networkidle0"});

    await page.evaluate(async()=>{
      if(document.fonts) await document.fonts.ready;
    });

    const pdf=await page.pdf({
      format:"A4",
      printBackground:true,
      preferCSSPageSize:true,
      margin:{top:"0",right:"0",bottom:"0",left:"0"}
    });

    res.setHeader("Content-Type","application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${id}.pdf"`
    );
    res.send(pdf);

  }catch(e){
    console.error(e);
    res.status(500).json({error:"PDF তৈরি করা যায়নি"});
  }finally{
    if(browser) await browser.close();
  }
});

function esc(v){
  return String(v||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function makeHTML(d){
return `<!doctype html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<style>
*{box-sizing:border-box}

@page{
  size:A4;
  margin:0;
}

html,body{
  margin:0;
  padding:0;
}

body{
  font-family:"Noto Sans Bengali","Noto Sans",Arial,sans-serif;
  color:#111;
  background:#fff;
}

.page{
  width:210mm;
  min-height:297mm;
  padding:14mm;
  background:#fff;
}

.header{
  text-align:center;
  border-bottom:2px solid #222;
  padding-bottom:12px;
}

.header h1{
  margin:0;
  font-size:27px;
}

.header p{
  margin:4px 0 0;
  font-size:15px;
}

.top{
  margin-top:18px;
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
}

.photo,.no-photo{
  width:35mm;
  height:45mm;
  border:1px solid #222;
}

.photo{
  object-fit:cover;
}

.no-photo{
  display:flex;
  align-items:center;
  justify-content:center;
}

.qr{
  width:32mm;
  height:32mm;
}

.application-id{
  margin-top:7px;
  font-size:13px;
  font-weight:bold;
}

.table{
  margin-top:20px;
  border-top:1px solid #222;
}

.row{
  display:flex;
  border-left:1px solid #222;
  border-right:1px solid #222;
  border-bottom:1px solid #222;
}

.label{
  width:34%;
  padding:9px;
  background:#f3f3f3;
  border-right:1px solid #222;
  font-weight:bold;
}

.value{
  width:66%;
  padding:9px;
}

.verified{
  margin-top:24px;
  text-align:center;
  font-size:17px;
  font-weight:bold;
}

.footer{
  margin-top:50px;
  text-align:center;
  font-size:12px;
}
</style>
</head>

<body>
<div class="page">

<div class="header">
<h1>আবেদনপত্র</h1>
<p>আবেদনকারীর তথ্য ও পরিচয়পত্র</p>
</div>

<div class="top">

<div>
${
d.photo
? `<img class="photo" src="${d.photo}">`
: `<div class="no-photo">ছবি</div>`
}

<div class="application-id">
আবেদন নম্বর: ${esc(d.applicationId)}
</div>
</div>

<div>
<img class="qr" src="${d.qrDataUrl}" alt="QR Code">
</div>

</div>

<div class="table">

<div class="row">
<div class="label">আবেদনকারীর নাম</div>
<div class="value">${esc(d.name)}</div>
</div>

<div class="row">
<div class="label">পিতার নাম</div>
<div class="value">${esc(d.father)}</div>
</div>

<div class="row">
<div class="label">মাতার নাম</div>
<div class="value">${esc(d.mother)}</div>
</div>

<div class="row">
<div class="label">মোবাইল নম্বর</div>
<div class="value">${esc(d.mobile)}</div>
</div>

<div class="row">
<div class="label">ঠিকানা</div>
<div class="value">${esc(d.address)}</div>
</div>

</div>

<div class="verified">
QR Code স্ক্যান করে তথ্য যাচাই করা যাবে।
</div>

<div class="footer">
এই ডকুমেন্টটি অনলাইনে যাচাইযোগ্য।
</div>

</div>
</body>
</html>`;
}

app.listen(PORT,()=>{
  console.log("Server চলছে: http://localhost:"+PORT);
});
