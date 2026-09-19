# Query: 
# ContextLines: 1

let classifier;
let imageModelURL = 'https://teachablemachine.withgoogle.com/models/RDY6OxklRd/';

let video;
let label = "Cargando...";
let x = 170;
let y = 70; // Subimos un poquito el cuadro para dejar lugar abajo al cartel de resultados
let ancho = 300;
let alto = 300;
let ColorRecuadro;
let rojo, verde, amarillo;

let port;
let writer;
let portButton;

let modelIsReady = false;
let videoIsReady = false;

function preload() {
  classifier = ml5.imageClassifier(imageModelURL + 'model.json', modelReady);
}

function modelReady() {
  console.log("¡Modelo cargado exitosamente!");
  modelIsReady = true;
  iniciarClasificacionSiTodoEstaListo();
}

function setup() {
  // Creamos el lienzo de 640x550 para que entre cómodo el cartel de resultados abajo
  let canvas = createCanvas(640, 550);
  canvas.parent("contenedor-sketch"); // Lo ubicamos dentro del div del HTML

  video = createCapture(VIDEO, videoReady);
  video.size(640, 480);
  video.hide();

  rojo = color(231, 76, 60);      // Rojo moderno
  verde = color(46, 204, 113);    // Verde moderno
  amarillo = color(241, 196, 15); // Amarillo / Naranja reposo
  ColorRecuadro = verde;  

  // Botón para conectar la placa Arduino por USB (ubicado debajo del canvas)
  portButton = createButton('Conectar Arduino');
  portButton.position(windowWidth / 2 - 75, 580);
  portButton.style('padding', '10px 15px');
  portButton.style('background-color', '#3498db');
  portButton.style('color', 'white');
  portButton.style('border', 'none');
  portButton.style('border-radius', '5px');
  portButton.style('cursor', 'pointer');
  portButton.mousePressed(conectarArduino);
}

function videoReady() {
  console.log("¡Cámara lista!");
  videoIsReady = true;
  iniciarClasificacionSiTodoEstaListo();
}

function iniciarClasificacionSiTodoEstaListo() {
  if (modelIsReady && videoIsReady) {
    label = "¡Todo listo! Escaneando...";
    classifyVideo();
  }
}

function draw() {
  background(30);

  // 1. Dibujar la cámara web con efecto espejo en el centro
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, 640, 480);
  pop();

  // 2. Dibujar el recuadro guía de escaneo
  noFill();
  stroke(ColorRecuadro);
  strokeWeight(4);
  rect(x, y, ancho, alto);
  
  fill(ColorRecuadro);
  noStroke();
  textSize(16);
  textAlign(LEFT);
  text("Coloque el residuo aquí", x + 10, y - 10);

  // ==========================================
  // 3. CARTEL DE RESULTADOS DEBAJO DE LA CÁMARA
  // ==========================================
  let bannerY = 490; // Posición Y debajo de los 480px de la cámara
  
  // Fondo del cartel de resultados (toma el color del estado actual)
  fill(ColorRecuadro);
  noStroke();
  rect(50, bannerY, 540, 45, 10); // Rectángulo con esquinas redondeadas

  // Texto dentro del cartel (letras oscuras si es amarillo brillante, blancas para rojo/verde)
  if (ColorRecuadro === amarillo) {
    fill(0); 
  } else {
    fill(255);
  }
  
  textSize(18);
  textAlign(CENTER, CENTER);
  text(label, width / 2, bannerY + 22.5);
}

function classifyVideo() {
  if (classifier && video) {
    let ImagenRecortada = video.get(x, y, ancho, alto);
    classifier.classify(ImagenRecortada, gotResult);
  }
}

function gotResult(results) {
  if (results && results.length > 0) {
    let etiqueta = results[0].label.toUpperCase();
    let confianza = nf(results[0].confidence * 100, 1, 0); 

    label = etiqueta + " - " + confianza + "%";

    // Evaluamos la clase y cambiamos el color visualmente
    if (etiqueta.includes("PAPEL")) {
      ColorRecuadro = verde;
      enviarAUnicoArduino("P");
    } 
    else if (etiqueta.includes("PLASTICO")) {
      ColorRecuadro = rojo;
      enviarAUnicoArduino("L");
    } 
    else {
      ColorRecuadro = amarillo;
      enviarAUnicoArduino("F");
    }
  }

  classifyVideo();
}

async function conectarArduino() {
  if ("serial" in navigator) {
    try {
      port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });

      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(port.writable);
      writer = textEncoder.writable.getWriter();

      portButton.html('Arduino Conectado ✔');
      portButton.style('background-color', '#2ecc71');
      portButton.attribute('disabled', '');
      console.log("Conectado con éxito a Arduino");
    } catch (err) {
      console.error("Error al conectar:", err);
    }
  } else {
    alert("Tu navegador no soporta Web Serial. Usa Google Chrome o Microsoft Edge.");
  }
}

async function enviarAUnicoArduino(letra) {
  if (!writer) {
    return; 
  }

  try {
    await writer.write(letra); 
  } catch (err) {
    console.error("Error al enviar al Arduino:", err);
  }
}