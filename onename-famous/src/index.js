'use strict';

// Famous dependencies
var DOMElement = require('famous/dom-renderables/DOMElement');
var FamousEngine = require('famous/core/FamousEngine');

// Boilerplate code to make your life easier
FamousEngine.init();

// Initialize with a scene; then, add a 'node' to the scene root
var logo = FamousEngine.createScene().addChild();

// Create an [image] DOM element providing the logo 'node' with the 'src' path
new DOMElement(logo, { tagName: 'img' })
    .setAttribute('src', './images/famous_logo.png');

// Chainable API
logo
    // Set size mode to 'absolute' to use absolute pixel values: (width 250px, height 250px)
    .setSizeMode('absolute', 'absolute', 'absolute')
    .setAbsoluteSize(150, 150)
    // Center the 'node' to the parent (the screen, in this instance)
    .setAlign(0.5, 0.5)
    // Set the translational origin to the center of the 'node'
    .setMountPoint(0.5, 0.5)
    // Set the rotational origin to the center of the 'node'
    .setOrigin(0.5, 0.5);

// Add a spinner component to the logo 'node' that is called, every frame
var spinner = logo.addComponent({
    onUpdate: function(time) {
        logo.setRotation(0, time / 300, 0);
        logo.requestUpdateOnNextTick(spinner);
    }
});

// Let the magic begin...
logo.requestUpdate(spinner);



var famous = require('famous');

var FamousEngine = famous.core.FamousEngine;
var Gravity3D = famous.physics.Gravity3D;
var Particle = famous.physics.Particle;
var PhysicsEngine = famous.physics.PhysicsEngine;
var Spring = famous.physics.Spring;
var Vec3 = famous.math.Vec3;

var Mesh = famous.webglRenderables.Mesh;
var Color = famous.utilities.Color;
var Circle = famous.webglGeometries.Circle;
var geometry = new Circle();

var colors = [ [151, 131, 242], [47, 189, 232] ];
var totalCols = 12;
var totalRows = 10;
var pe = new PhysicsEngine();

function createColorStep(step, isDom) {
  step -= (step >= totalCols) ? totalCols : 0;
  var r = colors[0][0] - Math.round(((colors[0][0] - colors[1][0]) / totalCols) * step);
  var g = colors[0][1] - Math.round(((colors[0][1] - colors[1][1]) / totalCols) * step);
  var b = colors[0][2] - Math.round(((colors[0][2] - colors[1][2]) / totalCols) * step);
  if (isDom) return 'rgb(' + r + ',' + g + ',' + b + ')';
  return [r, g, b];
}

function Phys (node, x, y) {
    this.id = node.addComponent(this);
    this.node = node;
    this.body = new Particle({
        mass: 1,
        position: new Vec3(x, y, 0)
    });
    this.force = new Spring(null, this.body, {
        period: 0.9,
        dampingRatio: 0.12,
        anchor: new Vec3(x, y, 0)
    });
    pe.add(this.body, this.force);
    node.requestUpdate(this.id);
}

Phys.prototype.onUpdate = function onUpdate () {
    var pos = this.body.position;
    this.node.setPosition(pos.x, pos.y, pos.z);
    this.node.requestUpdateOnNextTick(this.id);
}

function Dot (node, i, sceneSize) {
    node.setProportionalSize(1 / 18, 1 / 18)
        .setDifferentialSize(-4, -4);

    new Mesh(node).setGeometry(geometry)
                  .setBaseColor(new Color(createColorStep(i / 18)));

    new Phys(node, sceneSize[0] * (i % totalRows) / totalRows,
                   sceneSize[1] * ((((i / totalRows)|0) % totalCols) / totalCols));
}

var grav = new Gravity3D(null, pe.bodies, {
    strength: -5e7,
    max: 1000,
    anchor: new Vec3()
});

pe.add(grav);

document.addEventListener('mousemove', function (e) {
    grav.anchor.set(e.pageX, e.pageY);
});
document.addEventListener('touchmove', function (e) {
    grav.anchor.set(e.changedTouches[0].pageX, e.changedTouches[0].pageY);
    e.preventDefault();
});

// APP CODE

FamousEngine.init();
var scene = FamousEngine.createScene();
var peUpdater = scene.addComponent({
    onUpdate: function (time) {
                  pe.update(time);
                  scene.requestUpdateOnNextTick(peUpdater);
              }
});
scene.requestUpdate(peUpdater);
var root = scene.addChild();
var sized = false;
root.addComponent({
    onSizeChange: function (size) {
        if (!sized) {
            for (var i = 0 ; i < (totalRows * totalCols) ; i++)
                Dot(root.addChild(), i, size);
            sized = true;
        }
    }
});
