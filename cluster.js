// The Nature of Code
// Daniel Shiffman
// http://natureofcode.com

// Force directed graph
// Heavily based on: http://code.google.com/p/fidgen/

var currSvdResult;
var selectedPair = -1;
var tempSpring;
var selectedSpring;

function Cluster(n,d,nodes, connectionsMatrix) {
  // A cluster is a grouping of nodes
  this.nodes = [];
  // Set the diameter
  this.diameter = d;
  
  this.connections = connectionsMatrix
  this.collisonSprings = []
  
  this.shownEntities = []
  for (var i=0; i<nodes.length ; i++) {
    this.shownEntities.push(false)
  }
  // Create the nodes
  for (var i = 0; i < nodes.length; i++) {
    node = new Node(nodes[i], new Vec2D(width/2, height/2))
    this.nodes.push(node);
  }
  
  this.moveNodeToTarget = function(i, target) {
    this.nodes[i].clearSprings()
    targetPoint = new VerletParticle2D(target)
    targetPoint.lock()
    spring = new VerletSpring2D(this.nodes[i], targetPoint, 1, 0.005)
    physics.addSpring(spring)
    this.nodes[i].springs.push(spring)
  }
  
  
  this.calculateInitialPositions = function() {
    // first create the list of indexs to show
    for (var i=0; i<this.nodes.length; i++) {
      if (i>=offset && i<offset+numOfEntitiesToShow) {
        this.shownEntities[i] = true
      }
      else {
        this.shownEntities[i] = false
      }
    }
    
    this.sMatrix = connectionsMatrix.map(function(value, index){ return value.map(function(value, index){r = value> 0.001 ? 1 : 0; return r;})})
    svdResult = getSvdMinMax(sMatrix)
    
    for (var i=0; i<this.nodes.length; i++) {
      pos = calculateXY(svdResult, i, this.shownEntities, Cluster.getStartBbox())
      this.moveNodeToTarget(i, pos)
    }
  }

  this.addCollisonSprings = function() {
    for (var i=0; i<this.nodes.length; i++) {
      for (var j=0; j<this.nodes.length; j++){
        if (this.shownEntities[i] && this.shownEntities[j]){
          var length = (this.nodes[i].r+ this.nodes[j].r)/2 + 15
          physics.addSpring(new VerletMinDistanceSpring2D(this.nodes[i], this.nodes[j], length, 0.1))
        }
      }
    }
  }
  
  this.calculateInitialPositions();
  this.addCollisonSprings();
  
  this.selectedLocation = new Vec2D(currVid.x-15, currVid.y-15);
  
  this.display = function() {
    // Show all the nodes
    this.run();
    for (var i = 0; i < this.nodes.length; i++) {
      this.nodes[i].display();
    }
  }
  
  this.run = function() {
    for (i=0; i<this.nodes.length; i++){
      this.nodes[i].unhighlight()
    }
    for (i=0; i<this.nodes.length; i++){
      if ( this.shownEntities[i] && this.nodes[i].containsCursor()) {
        this.nodes[i].highlight()
        for (j = 0; j < this.nodes.length; j++) {
          if (this.connections[i][j] > 0) {
              this.nodes[j].highlight()
          }
        }
      }
    }
  }
  
  this.moveSelectedNodeToTarget = function(i, target) {
    this.nodes[i].clearSprings
    targetPoint = new VerletParticle2D(target)
    targetPoint.lock()
    tempSpring = new VerletSpring2D(this.nodes[i], targetPoint, 1, 0.005)
    physics.addSpring(tempSpring)
    this.nodes[i].springs.push(tempSpring)
  }
  
  this.moveSelectedPair = function(i) {
    if (i==selectedPair) {
      selected = i
      selectedPair = -1
      this.moveAllAccordingToSelected();
      return;
    }
    if (i==selected) {
      currVid.hide()
      selected = -1
      selectedPair = -1
      physics.springs = []
      this.calculateInitialPositions();
      this.addCollisonSprings()
      return;
    }
    //return prev selected to place
    if (selectedPair!=-1) {
      physics.removeSpring(tempSpring)
      var prevLocation = calculateXY(currSvdResult, selectedPair, this.shownEntities, Cluster.getSelectionBbox())
      this.moveNodeToTarget(selectedPair, prevLocation)
    }
    // update new selected
    selectedPair= i
    keyPair = sort([this.nodes[selected].name, this.nodes[i].name]).join(',')
    currVid.show();
    videoLink = entitiesMatrix[keyPair].matching_caps[0].link
    this.moveNodeToTarget(i, this.selectedLocation)
    // physics.springs = []
    // this.addCollisonSprings()
    currVid.setLink(videoLink)
    currVid.play()
  }
  
  this.moveAllAccordingToSelected = function() {
     //currVid.hide();
      currVid.setLink("")
      currVid.show();
      var selectedPair = [this.nodes[selected].name, this.nodes[selected].name].join(',');
      //print (selectedPair)
      if (selectedPair in entitiesMatrix) {
        videoLink = entitiesMatrix[selectedPair].matching_caps[0].link
        currVid.setLink(videoLink)
        currVid.play();
      }
      else {
        currVid.hide();
      }
     
     physics.springs = []
     this.moveNodeToTarget(selected, this.selectedLocation)
     indexList = []
     
     for (var i=0; i<this.nodes.length; i++) {
      indexList.push(this.connections[selected][i]>0? true: false)
     }
     indexList[selected] = true
     this.shownEntities = indexList
     tempMatrix = this.sMatrix.map(function(value, index){
       return value.map(function(value, index){
         return indexList[index]? value: 0
        })
       })
     currSvdResult = getSvdMinMax(tempMatrix)
     var selBbox = Cluster.getSelectionBbox()
     for (i=0; i<this.nodes.length; i++) {
       if (i!=selected) {
          pos = calculateXY(currSvdResult, i, indexList, selBbox)
          this.moveNodeToTarget(i, pos)
       }
     }
     this.addCollisonSprings()
    
  }
  
  this.mouseClick = function(x,y) {
    if (videosMode) {
      if (selected!=-1) {
        for(var i = 0; i<this.nodes.length; i++){
          if (this.nodes[i].containsCursor()) {
            this.moveSelectedPair(i)
            return;
          }
        }
      }
    }
    var foundSelected = false
    for(var i=0; i<this.nodes.length; i++) {
      if (this.nodes[i].containsCursor()) {
        selected = i
        foundSelected = true
        break;
      }
    }
   if (foundSelected) {
     this.moveAllAccordingToSelected();
   }
   else {
     selected = -1
     selectedPair = -1
   }
  }
  
  // Draw all the internal connections
  this.showConnections = function() {
    push();
    
    //strokeWeight(1);
    for (var i = 0; i < this.nodes.length-1; i++) {
      for (var j = i+1; j < this.nodes.length; j++) {
        if (this.connections[i][j]>0 && this.shownEntities[i] && this.shownEntities[j]){
          if (this.nodes[i].highlighted && this.nodes[j].highlighted) {
            stroke(255, 255);
            strokeWeight(3);
          }
          else {
            stroke(255, 160);
            strokeWeight(1);
          }
          line(this.nodes[i].x, this.nodes[i].y, this.nodes[j].x, this.nodes[j].y);
        }
      }
    }
  }
  pop();
}



Cluster.getSelectionBbox = function(){
  return {
  x: grid.margin.left+maxRadius, 
  w: width/2-maxRadius, 
  y: grid.margin.top+maxRadius, 
  h: height-grid.margin.right-maxRadius
  }
}

Cluster.getStartBbox = function(){
  return {
  x: grid.margin.left+maxRadius*2,
  w: width-grid.margin.right-grid.colwidth()-maxRadius*2, 
  y: grid.margin.top+maxRadius, 
  h: height-grid.margin.top-maxRadius
  }
  
}
function getSvdMinMax(adjancyMatrix) {
  svdResult = numeric.svd(sMatrix);
  r = {}
  r.svdMatrix = svdResult
  r.minX = 100
  r.maxX = -100
  r.minY = 100
  r.maxY = -100
  for (i = 0; i < numOfEntitiesToShow; i++){//svdResult.U.length; i++) {
    r.minX = svdResult.U[i][0] < r.minX ? svdResult.U[i][0] : r.minX
    r.minY = svdResult.U[i][1] < r.minY ? svdResult.U[i][1] : r.minY
    r.maxX = svdResult.U[i][0] > r.maxX ? svdResult.U[i][0] : r.maxX
    r.maxY = svdResult.U[i][1] > r.maxY ? svdResult.U[i][1] : r.maxY
  }
  return r
}

function calculateXY(svdResult, i, indexList, bbox) {
  if (!indexList[i]) {
    mappedX = -width*2
    mappedY = height/2
  }
  else {
  mappedX = map(svdResult.svdMatrix.U[i][0], svdResult.minX, svdResult.maxX, bbox.x, bbox.w)
  mappedY = map(svdResult.svdMatrix.U[i][1], svdResult.minY, svdResult.maxY, bbox.y, bbox.h)
  }
  return (new Vec2D(mappedX, mappedY))
}


