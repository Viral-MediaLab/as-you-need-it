var playing = false;

var videoLink = "";

function Video() {
  
  //this.vid = createVideo("assets/blank-video.mp4")
  this.margins = 2
  this.w = grid.colwidth()
  this.h = this.w*9/16
  this.x = width-grid.margin.right-grid.colwidth()
  this.y = grid.margin.top+grid.rowheight()*4
  this.vid = createVideo("")
  this.vid.size(this.w-this.margins*2, this.h-this.margins*2)
  this.vid.position(this.x+this.margins, this.y+this.margins)
  this.vid.attribute("poster", "loading_spinner.gif")
  //this.vid.mousePressed(this.toggleVid())
  this.shown = false;
  
  this.toggleVid = function() {
  if (playing) {
    this.vid.pause();
  } else {
    this.vid.play();
  }
  playing = !playing;
  }
  
  this.click = function() {
    if (this.containsCursor()) {
      this.toggleVid()
    }
  }
  
  this.containsCursor = function() {
    return (mouseX > this.x && mouseX < this.x + this.w) &&
          (mouseY > this.y && mouseY < this.y + this.h);
  }
  
  this.setLink = function(link){
    this.vid.src = link
  }
  
  this.play = function(){
    this.vid.play()
    playing = true;
  }
  
  this.display = function() {
    if (this.shown) {
      this.drawRect();
      this.vid.show();
    }
    else {
      this.vid.hide();
    }
  }
  
  this.show = function() {
    this.vid.play();
    this.shown = true
  }
  
  this.hide = function() {
    this.vid.stop();
    this.vid.hide();
    this.shown = false;
  }
  
  this.drawRect = function(){
    push()
    rectMode(CORNER)
    fill(0)
    noStroke()
    rect(this.x+this.margins, this.y+this.margins, 
    this.w-this.margins*2, this.h-this.margins*2)
    pop()
  }

}