// The Nature of Code
// Daniel Shiffman
// http://natureofcode.com

// Force directed graph
// Heavily based on: http://code.google.com/p/fidgen/

// Notice how we are using inheritance here!
// We could have just stored a reference to a VerletParticle object
// inside the Node object, but inheritance is a nice alternative
var minRadius; //initialized in sketch.js
var maxRadius; //initialized in sketch.js
function Node(entity, pos) {
  VerletParticle2D.call(this,pos);
  
  //this.greyColor = color('rgb(60,61,61)')
  this.highlighted = false;
  this.greyColor = color('rgb(131, 135, 148)')
  this.highlightColor = color('rgb(4, 182, 152)')
  
  this.maxspeed = 30
  this.name = entity[0]
  //this.entity = entity
  this.count = entity[1].score
  this.type = entity[1].type
  
  this.springs = []

  //display vars
  //this.sizeText = map(this.count, 0, maxCount, 15, 40)
  this.sizeText = min(max(minRadius/4, 10), 15)
  this.string = trim(this.name.capitalizeFirstLetter())
  this.bbox = robotoFontBold.textBounds(this.name.split(' ').join('-').capitalizeFirstLetter(), round(pos.x), round(pos.y), this.sizeText);
  this.h = this.bbox.h*3
  this.w = this.bbox.w+20
  
  //print (this.bbox)
  this.r =  max(map(this.count, 0, maxCount, minRadius, maxRadius), this.bbox.w+4)
  this.stringWidth = 0
  this.c = Node.colorMap[this.type]//this.greyColor
  this.textColor = 255
  
  this.drawRect = function() {
    push();
    ellipseMode(CENTER)
    noStroke();
    if (this.highlighted ) {
      push();
      fill(255)
      ellipse(this.x, this.y, this.r+3, this.r+3)
      pop();
    }
    colorMode(RGB);
    fill(this.c)
    ellipse(this.x, this.y, this.r, this.r)
    pop();
  }
  this.displayText = function() {
    push();
    textAlign(CENTER, CENTER)
    noStroke();
    fill(this.textColor)
    textSize(this.sizeText)
    //stroke(this.textColor)
    textFont (robotoFontBold)
    text(this.string, this.x, this.y)
    pop();
  }

  // Override the display method
  this.display = function(){
    this.drawRect()
    this.displayText()
  }
  
  this.highlight = function() {
    //print (Node.colorMap[this.type].r)
    push()
    colorMode(HSL)
    this.c = color(hue(Node.colorMap[this.type]), 30,70, 100);
    //print (this.c)
    //this.textColor = color('rgb(182, 197, 201)')
    this.textColor = 255
    this.highlighted = true
    pop()
  }
  
  this.unhighlight = function() {
    this.c = Node.colorMap[this.type]//this.greyColor
    this.textColor = 255
    this.highlighted = false
  }
  
  this.containsCursor = function() {
    return sq((mouseX - this.x) / this.r) + sq((mouseY - this.y) / this.r) < 0.25;
  }
  
  this.clearSprings = function() {
    for (var i=0; i<this.springs.length; i++) {
      physics.removeSpring(this.springs[i])
    }
    this.springs = []
  }
  
}

// Inherit from the parent class
Node.prototype = Object.create(VerletParticle2D.prototype);
Node.prototype.constructor = Node;

Node.setRadius = function() {
  minRadius = grid.rowheight()/2
  maxRadius = grid.colwidth()/2
}

Node.colorMap = {}

// colors using schema.js
Node.getColorMap = function(typesList) {
  //f = chroma.scale(['#DCEDC8', '#42B3D5', '#1A237E' ])
  f = chroma.scale(['#d0b45b', '#22908c', '#450d54' ]).domain([0,Object.keys(typesList).length-1])
  //types = getSortedKeys(typesList);
  var i=0
  for (key in typesList){
    Node.colorMap[key] = color(f(i)._rgb)
    i++
  }
}

//colors using hue change
Node.getColorMapN = function (typesList) {
  push();
  var currentHue = 210
  numColors = Object.keys(typesList).length
  step = 360/currentHue
  var hues = generateHues(numColors, 210)
  var i =0
  colorMode(HSL);
  var s=50;
  var l=30;
  h = 210;
  types = getSortedKeys(typesList);
  for (var i=0; i<types.length; i++){//(key in typesList){
    //h = map (i, 0, numColors, 0, 360)
    if (h > 360) {
      h -= 360;
    }
    Node.colorMap[types[i]] = color(hues[i], s, l)
    h+=step

    //i++
  }
  pop();
}

function generateHues(numColors, start) {
  hues = []
  // start = 90
  // end = 230
  currentHue = start
  hues.push(currentHue)
  step = 360 / numColors
  for (var i = 1; i < numColors; i++) {
    currentHue += step;
    if (currentHue > 360) {
      currentHue -= 360;
    }
    hues.push(currentHue)
  }
  var i
  var j
  var holder = 0
  for (i = 0, j = floor(numColors / 2); i < floor(numColors / 2); i += 2, j += 2) {
    holder = hues[i];
    hues[i] = hues[j];
    hues[j] = holder;
  }
  //return hues
  //shuffle(hues,true)
  return hues
}

function getSortedKeys(obj) {
    var keys = []; for(var key in obj) keys.push(key);
    return keys.sort(function(a,b){return obj[a]-obj[b]}, reverse=true);
}


