(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * Camera is a component that is responsible for sending information to the renderer about where
 * the camera is in the scene.  This allows the user to set the type of projection, the focal depth,
 * and other properties to adjust the way the scenes are rendered.
 *
 * @class Camera
 *
 * @param {Node} node to which the instance of Camera will be a component of
 */
function Camera(node) {
    this._node = node;
    this._projectionType = Camera.ORTHOGRAPHIC_PROJECTION;
    this._focalDepth = 0;
    this._near = 0;
    this._far = 0;
    this._requestingUpdate = false;
    this._id = node.addComponent(this);
    this._viewTransform = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    this._viewDirty = false;
    this._perspectiveDirty = false;
    this.setFlat();
}

Camera.FRUSTUM_PROJECTION = 0;
Camera.PINHOLE_PROJECTION = 1;
Camera.ORTHOGRAPHIC_PROJECTION = 2;

/**
 * @method
 *
 * @return {String} Name of the component
 */
Camera.prototype.toString = function toString() {
    return 'Camera';
};

/**
 * Gets object containing serialized data for the component
 *
 * @method
 *
 * @return {Object} the state of the component
 */
Camera.prototype.getValue = function getValue() {
    return {
        component: this.toString(),
        projectionType: this._projectionType,
        focalDepth: this._focalDepth,
        near: this._near,
        far: this._far
    };
};

/**
 * Set the components state based on some serialized data
 *
 * @method
 *
 * @param {Object} state an object defining what the state of the component should be
 *
 * @return {Boolean} status of the set
 */
Camera.prototype.setValue = function setValue(state) {
    if (this.toString() === state.component) {
        this.set(state.projectionType, state.focalDepth, state.near, state.far);
        return true;
    }
    return false;
};

/**
 * Set the internals of the component
 *
 * @method
 *
 * @param {Number} type an id corresponding to the type of projection to use
 * @param {Number} depth the depth for the pinhole projection model
 * @param {Number} near the distance of the near clipping plane for a frustum projection
 * @param {Number} far the distanct of the far clipping plane for a frustum projection
 * 
 * @return {Boolean} status of the set
 */
Camera.prototype.set = function set(type, depth, near, far) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }
    this._projectionType = type;
    this._focalDepth = depth;
    this._near = near;
    this._far = far;
};

/**
 * Set the camera depth for a pinhole projection model
 *
 * @method
 *
 * @param {Number} depth the distance between the Camera and the origin
 *
 * @return {Camera} this
 */
Camera.prototype.setDepth = function setDepth(depth) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }
    this._perspectiveDirty = true;
    this._projectionType = Camera.PINHOLE_PROJECTION;
    this._focalDepth = depth;
    this._near = 0;
    this._far = 0;

    return this;
};

/**
 * Gets object containing serialized data for the component
 *
 * @method
 *
 * @param {Number} near distance from the near clipping plane to the camera
 * @param {Number} far distance from the far clipping plane to the camera
 * 
 * @return {Camera} this
 */
Camera.prototype.setFrustum = function setFrustum(near, far) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    this._perspectiveDirty = true;
    this._projectionType = Camera.FRUSTUM_PROJECTION;
    this._focalDepth = 0;
    this._near = near;
    this._far = far;

    return this;
};

/**
 * Set the Camera to have orthographic projection
 *
 * @method
 *
 * @return {Camera} this
 */
Camera.prototype.setFlat = function setFlat() {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    this._perspectiveDirty = true;
    this._projectionType = Camera.ORTHOGRAPHIC_PROJECTION;
    this._focalDepth = 0;
    this._near = 0;
    this._far = 0;

    return this;
};

/**
 * When the node this component is attached to updates, the Camera will
 * send new camera information to the Compositor to update the rendering
 * of the scene.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Camera.prototype.onUpdate = function onUpdate() {
    this._requestingUpdate = false;

    var path = this._node.getLocation();

    this._node
        .sendDrawCommand('WITH')
        .sendDrawCommand(path);

    if (this._perspectiveDirty) {
        this._perspectiveDirty = false;

        switch (this._projectionType) {
            case Camera.FRUSTUM_PROJECTION:
                this._node.sendDrawCommand('FRUSTUM_PROJECTION');
                this._node.sendDrawCommand(this._near);
                this._node.sendDrawCommand(this._far);
                break;
            case Camera.PINHOLE_PROJECTION:
                this._node.sendDrawCommand('PINHOLE_PROJECTION');
                this._node.sendDrawCommand(this._focalDepth);
                break;
            case Camera.ORTHOGRAPHIC_PROJECTION:
                this._node.sendDrawCommand('ORTHOGRAPHIC_PROJECTION');
                break;
        }
    }

    if (this._viewDirty) {
        this._viewDirty = false;

        this._node.sendDrawCommand('CHANGE_VIEW_TRANSFORM');
        this._node.sendDrawCommand(this._viewTransform[0]);
        this._node.sendDrawCommand(this._viewTransform[1]);
        this._node.sendDrawCommand(this._viewTransform[2]);
        this._node.sendDrawCommand(this._viewTransform[3]);

        this._node.sendDrawCommand(this._viewTransform[4]);
        this._node.sendDrawCommand(this._viewTransform[5]);
        this._node.sendDrawCommand(this._viewTransform[6]);
        this._node.sendDrawCommand(this._viewTransform[7]);

        this._node.sendDrawCommand(this._viewTransform[8]);
        this._node.sendDrawCommand(this._viewTransform[9]);
        this._node.sendDrawCommand(this._viewTransform[10]);
        this._node.sendDrawCommand(this._viewTransform[11]);

        this._node.sendDrawCommand(this._viewTransform[12]);
        this._node.sendDrawCommand(this._viewTransform[13]);
        this._node.sendDrawCommand(this._viewTransform[14]);
        this._node.sendDrawCommand(this._viewTransform[15]);
    }
};

/**
 * When the transform of the node this component is attached to
 * changes, have the Camera update its projection matrix and
 * if needed, flag to node to update.
 *
 * @method
 *
 * @param {Array} transform an array denoting the transform matrix of the node
 *
 * @return {Camera} this
 */
Camera.prototype.onTransformChange = function onTransformChange(transform) {
    var a = transform;
    this._viewDirty = true;

    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
    a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
    a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
    a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

    b00 = a00 * a11 - a01 * a10,
    b01 = a00 * a12 - a02 * a10,
    b02 = a00 * a13 - a03 * a10,
    b03 = a01 * a12 - a02 * a11,
    b04 = a01 * a13 - a03 * a11,
    b05 = a02 * a13 - a03 * a12,
    b06 = a20 * a31 - a21 * a30,
    b07 = a20 * a32 - a22 * a30,
    b08 = a20 * a33 - a23 * a30,
    b09 = a21 * a32 - a22 * a31,
    b10 = a21 * a33 - a23 * a31,
    b11 = a22 * a33 - a23 * a32,

    det = 1/(b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);

    this._viewTransform[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    this._viewTransform[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    this._viewTransform[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    this._viewTransform[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    this._viewTransform[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    this._viewTransform[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    this._viewTransform[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    this._viewTransform[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    this._viewTransform[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    this._viewTransform[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    this._viewTransform[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    this._viewTransform[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    this._viewTransform[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    this._viewTransform[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    this._viewTransform[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    this._viewTransform[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
};

module.exports = Camera;

},{}],2:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * Channels are being used for interacting with the UI Thread when running in
 * a Web Worker or with the UIManager/ Compositor when running in single
 * threaded mode (no Web Worker).
 *
 * @class Channel
 * @constructor
 */
function Channel() {
    if (typeof self !== 'undefined' && self.window !== self) {
        this._enterWorkerMode();
    }
}


/**
 * Called during construction. Subscribes for `message` event and routes all
 * future `sendMessage` messages to the Main Thread ("UI Thread").
 *
 * Primarily used for testing.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Channel.prototype._enterWorkerMode = function _enterWorkerMode() {
    this._workerMode = true;
    var _this = this;
    self.addEventListener('message', function onmessage(ev) {
        _this.onMessage(ev.data);
    });
};

/**
 * Meant to be overriden by `Famous`.
 * Assigned method will be invoked for every received message.
 *
 * @type {Function}
 * @override
 *
 * @return {undefined} undefined
 */
Channel.prototype.onMessage = null;

/**
 * Sends a message to the UIManager.
 *
 * @param  {Any}    message Arbitrary message object.
 *
 * @return {undefined} undefined
 */
Channel.prototype.sendMessage = function sendMessage (message) {
    if (this._workerMode) {
        self.postMessage(message);
    }
    else {
        this.onmessage(message);
    }
};

/**
 * Meant to be overriden by the UIManager when running in the UI Thread.
 * Used for preserving API compatibility with Web Workers.
 * When running in Web Worker mode, this property won't be mutated.
 *
 * Assigned method will be invoked for every message posted by `famous-core`.
 *
 * @type {Function}
 * @override
 */
Channel.prototype.onmessage = null;

/**
 * Sends a message to the manager of this channel (the `Famous` singleton) by
 * invoking `onMessage`.
 * Used for preserving API compatibility with Web Workers.
 *
 * @private
 * @alias onMessage
 *
 * @param {Any} message a message to send over the channel
 *
 * @return {undefined} undefined
 */
Channel.prototype.postMessage = function postMessage(message) {
    return this.onMessage(message);
};

module.exports = Channel;

},{}],3:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * Equivalent of an Engine in the Worker Thread. Used to synchronize and manage
 * time across different Threads.
 *
 * @class  Clock
 * @constructor
 * @private
 */
function Clock () {
    this._time = 0;
    this._frame = 0;
    this._timerQueue = [];
    this._updatingIndex = 0;

    this._scale = 1;
    this._scaledTime = this._time;
}

/**
 * Sets the scale at which the clock time is passing.
 * Useful for slow-motion or fast-forward effects.
 * 
 * `1` means no time scaling ("realtime"),
 * `2` means the clock time is passing twice as fast,
 * `0.5` means the clock time is passing two times slower than the "actual"
 * time at which the Clock is being updated via `.step`.
 *
 * Initally the clock time is not being scaled (factor `1`).
 * 
 * @method  setScale
 * @chainable
 * 
 * @param {Number} scale    The scale at which the clock time is passing.
 *
 * @return {Clock} this
 */
Clock.prototype.setScale = function setScale (scale) {
    this._scale = scale;
    return this;
};

/**
 * @method  getScale
 * 
 * @return {Number} scale    The scale at which the clock time is passing.
 */
Clock.prototype.getScale = function getScale () {
    return this._scale;
};

/**
 * Updates the internal clock time.
 *
 * @method  step
 * @chainable
 * 
 * @param  {Number} time high resolution timstamp used for invoking the
 *                       `update` method on all registered objects
 * @return {Clock}       this
 */
Clock.prototype.step = function step (time) {
    this._frame++;

    this._scaledTime = this._scaledTime + (time - this._time)*this._scale;
    this._time = time;

    for (var i = 0; i < this._timerQueue.length; i++) {
        if (this._timerQueue[i](this._scaledTime)) {
            this._timerQueue.splice(i, 1);
        }
    }
    return this;
};

/**
 * Returns the internal clock time.
 *
 * @method  now
 * 
 * @return  {Number} time high resolution timstamp used for invoking the
 *                       `update` method on all registered objects
 */
Clock.prototype.now = function now () {
    return this._scaledTime;
};

/**
 * Returns the internal clock time.
 *
 * @method  getTime
 * @deprecated Use #now instead
 * 
 * @return  {Number} time high resolution timstamp used for invoking the
 *                       `update` method on all registered objects
 */
Clock.prototype.getTime = Clock.prototype.now;

/**
 * Returns the number of frames elapsed so far.
 *
 * @method getFrame
 * 
 * @return {Number} frames
 */
Clock.prototype.getFrame = function getFrame () {
    return this._frame;
};

/**
 * Wraps a function to be invoked after a certain amount of time.
 * After a set duration has passed, it executes the function and
 * removes it as a listener to 'prerender'.
 *
 * @method setTimeout
 *
 * @param {Function} callback function to be run after a specified duration
 * @param {Number} delay milliseconds from now to execute the function
 *
 * @return {Function} timer function used for Clock#clearTimer
 */
Clock.prototype.setTimeout = function (callback, delay) {
    var params = Array.prototype.slice.call(arguments, 2);
    var startedAt = this._time;
    var timer = function(time) {
        if (time - startedAt >= delay) {
            callback.apply(null, params);
            return true;
        }
        return false;
    };
    this._timerQueue.push(timer);
    return timer;
};


/**
 * Wraps a function to be invoked after a certain amount of time.
 *  After a set duration has passed, it executes the function and
 *  resets the execution time.
 *
 * @method setInterval
 *
 * @param {Function} callback function to be run after a specified duration
 * @param {Number} delay interval to execute function in milliseconds
 *
 * @return {Function} timer function used for Clock#clearTimer
 */
Clock.prototype.setInterval = function setInterval(callback, delay) {
    var params = Array.prototype.slice.call(arguments, 2);
    var startedAt = this._time;
    var timer = function(time) {
        if (time - startedAt >= delay) {
            callback.apply(null, params);
            startedAt = time;
        }
        return false;
    };
    this._timerQueue.push(timer);
    return timer;
};

/**
 * Removes previously via `Clock#setTimeout` or `Clock#setInterval`
 * registered callback function
 *
 * @method clearTimer
 * @chainable
 * 
 * @param  {Function} timer  previously by `Clock#setTimeout` or
 *                              `Clock#setInterval` returned callback function
 * @return {Clock}              this
 */
Clock.prototype.clearTimer = function (timer) {
    var index = this._timerQueue.indexOf(timer);
    if (index !== -1) {
        this._timerQueue.splice(index, 1);
    }
    return this;
};

module.exports = Clock;


},{}],4:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*jshint -W079 */

'use strict';

// TODO: Dispatch should be generalized so that it can work on any Node
// not just Contexts.

var Event = require('./Event');

/**
 * The Dispatch class is used to propogate events down the
 * scene graph.
 *
 * @class Dispatch
 * @param {Scene} context The context on which it operates
 * @constructor
 */
function Dispatch (context) {

    if (!context) throw new Error('Dispatch needs to be instantiated on a node');

    this._context = context; // A reference to the context
                             // on which the dispatcher
                             // operates

    this._queue = []; // The queue is used for two purposes
                      // 1. It is used to list indicies in the
                      //    Nodes path which are then used to lookup
                      //    a node in the scene graph.
                      // 2. It is used to assist dispatching
                      //    such that it is possible to do a breadth first
                      //    traversal of the scene graph.
}

/**
 * lookupNode takes a path and returns the node at the location specified
 * by the path, if one exists. If not, it returns undefined.
 *
 * @param {String} location The location of the node specified by its path
 *
 * @return {Node | undefined} The node at the requested path
 */
Dispatch.prototype.lookupNode = function lookupNode (location) {
    if (!location) throw new Error('lookupNode must be called with a path');

    var path = this._queue;

    _splitTo(location, path);

    if (path[0] !== this._context.getSelector()) return void 0;

    var children = this._context.getChildren();
    var child;
    var i = 1;
    path[0] = this._context;

    while (i < path.length) {
        child = children[path[i]];
        path[i] = child;
        if (child) children = child.getChildren();
        else return void 0;
        i++;
    }

    return child;
};

/**
 * dispatch takes an event name and a payload and dispatches it to the
 * entire scene graph below the node that the dispatcher is on. The nodes
 * receive the events in a breadth first traversal, meaning that parents
 * have the opportunity to react to the event before children.
 *
 * @param {String} event name of the event
 * @param {Any} payload the event payload
 *
 * @return {undefined} undefined
 */
Dispatch.prototype.dispatch = function dispatch (event, payload) {
    if (!event) throw new Error('dispatch requires an event name as it\'s first argument');

    var queue = this._queue;
    var item;
    var i;
    var len;
    var children;

    queue.length = 0;
    queue.push(this._context);

    while (queue.length) {
        item = queue.shift();
        if (item.onReceive) item.onReceive(event, payload);
        children = item.getChildren();
        for (i = 0, len = children.length ; i < len ; i++) queue.push(children[i]);
    }
};

/**
 * dispatchUIevent takes a path, an event name, and a payload and dispatches them in
 * a manner anologous to DOM bubbling. It first traverses down to the node specified at
 * the path. That node receives the event first, and then every ancestor receives the event
 * until the context.
 *
 * @param {String} path the path of the node
 * @param {String} event the event name
 * @param {Any} payload the payload
 *
 * @return {undefined} undefined
 */
Dispatch.prototype.dispatchUIEvent = function dispatchUIEvent (path, event, payload) {
    if (!path) throw new Error('dispatchUIEvent needs a valid path to dispatch to');
    if (!event) throw new Error('dispatchUIEvent needs an event name as its second argument');

    var queue = this._queue;
    var node;

    Event.call(payload);
    payload.node = this.lookupNode(path); // After this call, the path is loaded into the queue
                                          // (lookUp node doesn't clear the queue after the lookup)

    while (queue.length) {
        node = queue.pop(); // pop nodes off of the queue to move up the ancestor chain.
        if (node.onReceive) node.onReceive(event, payload);
        if (payload.propagationStopped) break;
    }
};

/**
 * _splitTo is a private method which takes a path and splits it at every '/'
 * pushing the result into the supplied array. This is a destructive change.
 *
 * @private
 * @param {String} string the specified path
 * @param {Array} target the array to which the result should be written
 *
 * @return {Array} the target after having been written to
 */
function _splitTo (string, target) {
    target.length = 0; // clears the array first.
    var last = 0;
    var i;
    var len = string.length;

    for (i = 0 ; i < len ; i++) {
        if (string[i] === '/') {
            target.push(string.substring(last, i));
            last = i + 1;
        }
    }

    if (i - last > 0) target.push(string.substring(last, i));

    return target;
}

module.exports = Dispatch;

},{"./Event":5}],5:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * The Event class adds the stopPropagation functionality
 * to the UIEvents within the scene graph.
 *
 * @constructor Event
 */
function Event () {
    this.propagationStopped = false;
    this.stopPropagation = stopPropagation;
}

/**
 * stopPropagation ends the bubbling of the event in the
 * scene graph.
 *
 * @method stopPropagation
 *
 * @return {undefined} undefined
 */
function stopPropagation () {
    this.propagationStopped = true;
}

module.exports = Event;


},{}],6:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var Clock = require('./Clock');
var Scene = require('./Scene');
var Channel = require('./Channel');
var UIManager = require('../renderers/UIManager');
var Compositor = require('../renderers/Compositor');
var RequestAnimationFrameLoop = require('../render-loops/RequestAnimationFrameLoop');

var ENGINE_START = ['ENGINE', 'START'];
var ENGINE_STOP = ['ENGINE', 'STOP'];
var TIME_UPDATE = ['TIME', null];

/**
 * Famous has two responsibilities, one to act as the highest level
 * updater and another to send messages over to the renderers. It is
 * a singleton.
 *
 * @class FamousEngine
 * @constructor
 */
function FamousEngine() {
    this._updateQueue = []; // The updateQueue is a place where nodes
                            // can place themselves in order to be
                            // updated on the frame.

    this._nextUpdateQueue = []; // the nextUpdateQueue is used to queue
                                // updates for the next tick.
                                // this prevents infinite loops where during
                                // an update a node continuously puts itself
                                // back in the update queue.

    this._scenes = {}; // a hash of all of the scenes's that the FamousEngine
                         // is responsible for.

    this._messages = TIME_UPDATE;   // a queue of all of the draw commands to
                                    // send to the the renderers this frame.

    this._inUpdate = false; // when the famous is updating this is true.
                            // all requests for updates will get put in the
                            // nextUpdateQueue

    this._clock = new Clock(); // a clock to keep track of time for the scene
                               // graph.

    this._channel = new Channel();
    this._channel.onMessage = this.handleMessage.bind(this);
}


/**
 * An init script that initializes the FamousEngine with options
 * or default parameters.
 *
 * @method
 *
 * @param {Object} options a set of options containing a compositor and a render loop
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.init = function init(options) {
    this.compositor = options && options.compositor || new Compositor();
    this.renderLoop = options && options.renderLoop || new RequestAnimationFrameLoop();
    this.uiManager = new UIManager(this.getChannel(), this.compositor, this.renderLoop);
    return this;
};

/**
 * Sets the channel that the engine will use to communicate to
 * the renderers.
 *
 * @method
 *
 * @param {Channel} channel     The channel to be used for communicating with
 *                              the `UIManager`/ `Compositor`.
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.setChannel = function setChannel(channel) {
    this._channel = channel;
    return this;
};

/**
 * Returns the channel that the engine is currently using
 * to communicate with the renderers.
 *
 * @method
 *
 * @return {Channel} channel    The channel to be used for communicating with
 *                              the `UIManager`/ `Compositor`.
 */
FamousEngine.prototype.getChannel = function getChannel () {
    return this._channel;
};

/**
 * _update is the body of the update loop. The frame consists of
 * pulling in appending the nextUpdateQueue to the currentUpdate queue
 * then moving through the updateQueue and calling onUpdate with the current
 * time on all nodes. While _update is called _inUpdate is set to true and
 * all requests to be placed in the update queue will be forwarded to the
 * nextUpdateQueue.
 *
 * @method
 *
 * @return {undefined} undefined
 */
FamousEngine.prototype._update = function _update () {
    this._inUpdate = true;
    var time = this._clock.now();
    var nextQueue = this._nextUpdateQueue;
    var queue = this._updateQueue;
    var item;

    this._messages[1] = time;

    while (nextQueue.length) queue.unshift(nextQueue.pop());

    while (queue.length) {
        item = queue.shift();
        if (item && item.onUpdate) item.onUpdate(time);
    }

    this._inUpdate = false;
};

/**
 * requestUpdates takes a class that has an onUpdate method and puts it
 * into the updateQueue to be updated at the next frame.
 * If FamousEngine is currently in an update, requestUpdate
 * passes its argument to requestUpdateOnNextTick.
 *
 * @method
 *
 * @param {Object} requester an object with an onUpdate method
 *
 * @return {undefined} undefined
 */
FamousEngine.prototype.requestUpdate = function requestUpdate (requester) {
    if (!requester)
        throw new Error(
            'requestUpdate must be called with a class to be updated'
        );

    if (this._inUpdate) this.requestUpdateOnNextTick(requester);
    else this._updateQueue.push(requester);
};

/**
 * requestUpdateOnNextTick is requests an update on the next frame.
 * If FamousEngine is not currently in an update than it is functionally equivalent
 * to requestUpdate. This method should be used to prevent infinite loops where
 * a class is updated on the frame but needs to be updated again next frame.
 *
 * @method
 *
 * @param {Object} requester an object with an onUpdate method
 *
 * @return {undefined} undefined
 */
FamousEngine.prototype.requestUpdateOnNextTick = function requestUpdateOnNextTick (requester) {
    this._nextUpdateQueue.push(requester);
};

/**
 * postMessage sends a message queue into FamousEngine to be processed.
 * These messages will be interpreted and sent into the scene graph
 * as events if necessary.
 *
 * @method
 *
 * @param {Array} messages an array of commands.
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.handleMessage = function handleMessage (messages) {
    if (!messages)
        throw new Error(
            'onMessage must be called with an array of messages'
        );

    var command;

    while (messages.length > 0) {
        command = messages.shift();
        switch (command) {
            case 'WITH':
                this.handleWith(messages);
                break;
            case 'FRAME':
                this.handleFrame(messages);
                break;
            default:
                throw new Error('received unknown command: ' + command);
        }
    }
    return this;
};

/**
 * handleWith is a method that takes an array of messages following the
 * WITH command. It'll then issue the next commands to the path specified
 * by the WITH command.
 *
 * @method
 *
 * @param {Array} messages array of messages.
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.handleWith = function handleWith (messages) {
    var path = messages.shift();
    var command = messages.shift();

    switch (command) {
        case 'TRIGGER': // the TRIGGER command sends a UIEvent to the specified path
            var type = messages.shift();
            var ev = messages.shift();

            this.getContext(path).getDispatch().dispatchUIEvent(path, type, ev);
            break;
        default:
            throw new Error('received unknown command: ' + command);
    }
    return this;
};

/**
 * handleFrame is called when the renderers issue a FRAME command to
 * FamousEngine. FamousEngine will then step updating the scene graph to the current time.
 *
 * @method
 *
 * @param {Array} messages array of messages.
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.handleFrame = function handleFrame (messages) {
    if (!messages) throw new Error('handleFrame must be called with an array of messages');
    if (!messages.length) throw new Error('FRAME must be sent with a time');

    this.step(messages.shift());
    return this;
};

/**
 * step updates the clock and the scene graph and then sends the draw commands
 * that accumulated in the update to the renderers.
 *
 * @method
 *
 * @param {Number} time current engine time
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.step = function step (time) {
    if (time == null) throw new Error('step must be called with a time');

    this._clock.step(time);
    this._update();

    if (this._messages.length) {
        this._channel.sendMessage(this._messages);
        this._messages.length = 2;
    }

    return this;
};

/**
 * returns the context of a particular path. The context is looked up by the selector
 * portion of the path and is listed from the start of the string to the first
 * '/'.
 *
 * @method
 *
 * @param {String} selector the path to look up the context for.
 *
 * @return {Context | Undefined} the context if found, else undefined.
 */
FamousEngine.prototype.getContext = function getContext (selector) {
    if (!selector) throw new Error('getContext must be called with a selector');

    var index = selector.indexOf('/');
    selector = index === -1 ? selector : selector.substring(0, index);

    return this._scenes[selector];
};

/**
 * returns the instance of clock within famous.
 *
 * @method
 *
 * @return {Clock} FamousEngine's clock
 */
FamousEngine.prototype.getClock = function getClock () {
    return this._clock;
};

/**
 * queues a message to be transfered to the renderers.
 *
 * @method
 *
 * @param {Any} command Draw Command
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.message = function message (command) {
    this._messages.push(command);
    return this;
};

/**
 * Creates a scene under which a scene graph could be built.
 *
 * @method
 *
 * @param {String} selector a dom selector for where the scene should be placed
 *
 * @return {Scene} a new instance of Scene.
 */
FamousEngine.prototype.createScene = function createScene (selector) {
    selector = selector || 'body';

    if (this._scenes[selector]) this._scenes[selector].dismount();
    this._scenes[selector] = new Scene(selector, this);
    return this._scenes[selector];
};

/**
 * Starts the engine running in the Main-Thread.
 * This effects **every** updateable managed by the Engine.
 *
 * @method
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.startEngine = function startEngine () {
    this._channel.sendMessage(ENGINE_START);
    return this;
};

/**
 * Stops the engine running in the Main-Thread.
 * This effects **every** updateable managed by the Engine.
 *
 * @method
 *
 * @return {FamousEngine} this
 */
FamousEngine.prototype.stopEngine = function stopEngine () {
    this._channel.sendMessage(ENGINE_STOP);
    return this;
};

module.exports = new FamousEngine();

},{"../render-loops/RequestAnimationFrameLoop":31,"../renderers/Compositor":32,"../renderers/UIManager":34,"./Channel":2,"./Clock":3,"./Scene":8}],7:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*jshint -W079 */

'use strict';

var Transform = require('./Transform');
var Size = require('./Size');

var TRANSFORM_PROCESSOR = new Transform();
var SIZE_PROCESSOR = new Size();

var IDENT = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

var ONES = [1, 1, 1];
var QUAT = [0, 0, 0, 1];

/**
 * Nodes define hierarchy and geometrical transformations. They can be moved
 * (translated), scaled and rotated.
 *
 * A Node is either mounted or unmounted. Unmounted nodes are detached from the
 * scene graph. Unmounted nodes have no parent node, while each mounted node has
 * exactly one parent. Nodes have an arbitary number of children, which can be
 * dynamically added using @{@link addChild}.
 *
 * Each Nodes have an arbitrary number of `components`. Those components can
 * send `draw` commands to the renderer or mutate the node itself, in which case
 * they define behavior in the most explicit way. Components that send `draw`
 * commands aare considered `renderables`. From the node's perspective, there is
 * no distinction between nodes that send draw commands and nodes that define
 * behavior.
 *
 * Because of the fact that Nodes themself are very unopinioted (they don't
 * "render" to anything), they are often being subclassed in order to add e.g.
 * components at initialization to them. Because of this flexibility, they might
 * as well have been called `Entities`.
 *
 * @example
 * // create three detached (unmounted) nodes
 * var parent = new Node();
 * var child1 = new Node();
 * var child2 = new Node();
 *
 * // build an unmounted subtree (parent is still detached)
 * parent.addChild(child1);
 * parent.addChild(child2);
 *
 * // mount parent by adding it to the context
 * var context = Famous.createContext("body");
 * context.addChild(parent);
 *
 * @class Node
 * @constructor
 */
function Node () {
    this._calculatedValues = {
        transform: new Float32Array(IDENT),
        size: new Float32Array(3)
    };

    this._requestingUpdate = false;
    this._inUpdate = false;

    this._updateQueue = [];
    this._nextUpdateQueue = [];

    this._freedComponentIndicies = [];
    this._components = [];

    this._freedChildIndicies = [];
    this._children = [];

    this._parent = null;
    this._globalUpdater = null;

    this._lastEulerX = 0;
    this._lastEulerY = 0;
    this._lastEulerZ = 0;
    this._lastEuler = false;

    this.value = new Node.Spec();
}

Node.RELATIVE_SIZE = Size.RELATIVE;
Node.ABSOLUTE_SIZE = Size.ABSOLUTE;
Node.RENDER_SIZE = Size.RENDER;
Node.DEFAULT_SIZE = Size.DEFAULT;

/**
 * A Node spec holds the "data" associated with a Node.
 *
 * @class Spec
 * @constructor
 *
 * @property {String} location path to the node (e.g. "body/0/1")
 * @property {Object} showState
 * @property {Boolean} showState.mounted
 * @property {Boolean} showState.shown
 * @property {Number} showState.opacity
 * @property {Object} offsets
 * @property {Float32Array.<Number>} offsets.mountPoint
 * @property {Float32Array.<Number>} offsets.align
 * @property {Float32Array.<Number>} offsets.origin
 * @property {Object} vectors
 * @property {Float32Array.<Number>} vectors.position
 * @property {Float32Array.<Number>} vectors.rotation
 * @property {Float32Array.<Number>} vectors.scale
 * @property {Object} size
 * @property {Float32Array.<Number>} size.sizeMode
 * @property {Float32Array.<Number>} size.proportional
 * @property {Float32Array.<Number>} size.differential
 * @property {Float32Array.<Number>} size.absolute
 * @property {Float32Array.<Number>} size.render
 */
Node.Spec = function Spec () {
    this.location = null;
    this.showState = {
        mounted: false,
        shown: false,
        opacity: 1
    };
    this.offsets = {
        mountPoint: new Float32Array(3),
        align: new Float32Array(3),
        origin: new Float32Array(3)
    };
    this.vectors = {
        position: new Float32Array(3),
        rotation: new Float32Array(QUAT),
        scale: new Float32Array(ONES)
    };
    this.size = {
        sizeMode: new Float32Array([Size.RELATIVE, Size.RELATIVE, Size.RELATIVE]),
        proportional: new Float32Array(ONES),
        differential: new Float32Array(3),
        absolute: new Float32Array(3),
        render: new Float32Array(3)
    };
    this.UIEvents = [];
};

/**
 * Determine the node's location in the scene graph hierarchy.
 * A location of `body/0/1` can be interpreted as the following scene graph
 * hierarchy (ignoring siblings of ancestors and additional child nodes):
 *
 * `Context:body` -> `Node:0` -> `Node:1`, where `Node:1` is the node the
 * `getLocation` method has been invoked on.
 *
 * @method getLocation
 *
 * @return {String} location (path), e.g. `body/0/1`
 */
Node.prototype.getLocation = function getLocation () {
    return this.value.location;
};

/**
 * @alias getId
 *
 * @return {String} the path of the Node
 */
Node.prototype.getId = Node.prototype.getLocation;

/**
 * Globally dispatches the event using the Scene's Dispatch. All nodes will
 * receive the dispatched event.
 *
 * @method emit
 *
 * @param  {String} event   Event type.
 * @param  {Object} payload Event object to be dispatched.
 *
 * @return {Node} this
 */
Node.prototype.emit = function emit (event, payload) {
    var current = this;

    while (current !== current.getParent()) {
        current = current.getParent();
    }

    current.getDispatch().dispatch(event, payload);
    return this;
};

// THIS WILL BE DEPRICATED
Node.prototype.sendDrawCommand = function sendDrawCommand (message) {
    this._globalUpdater.message(message);
    return this;
};

/**
 * Recursively serializes the Node, including all previously added components.
 *
 * @method getValue
 *
 * @return {Object}     Serialized representation of the node, including
 *                      components.
 */
Node.prototype.getValue = function getValue () {
    var numberOfChildren = this._children.length;
    var numberOfComponents = this._components.length;
    var i = 0;

    var value = {
        location: this.value.location,
        spec: this.value,
        components: new Array(numberOfComponents),
        children: new Array(numberOfChildren)
    };

    for (; i < numberOfChildren ; i++)
        if (this._children[i] && this._children[i].getValue)
            value.children[i] = this._children[i].getValue();

    for (i = 0 ; i < numberOfComponents ; i++)
        if (this._components[i] && this._components[i].getValue)
            value.components[i] = this._components[i].getValue();

    return value;
};

/**
 * Similar to @{@link getValue}, but returns the actual "computed" value. E.g.
 * a proportional size of 0.5 might resolve into a "computed" size of 200px
 * (assuming the parent has a width of 400px).
 *
 * @method getComputedValue
 *
 * @return {Object}     Serialized representation of the node, including
 *                      children, excluding components.
 */
Node.prototype.getComputedValue = function getComputedValue () {
    var numberOfChildren = this._children.length;

    var value = {
        location: this.value.location,
        computedValues: this._calculatedValues,
        children: new Array(numberOfChildren)
    };

    for (var i = 0 ; i < numberOfChildren ; i++)
        value.children[i] = this._children[i].getComputedValue();

    return value;
};

/**
 * Retrieves all children of the current node.
 *
 * @method getChildren
 *
 * @return {Array.<Node>}   An array of children.
 */
Node.prototype.getChildren = function getChildren () {
    return this._children;
};

/**
 * Retrieves the parent of the current node. Unmounted nodes do not have a
 * parent node.
 *
 * @method getParent
 *
 * @return {Node}       Parent node.
 */
Node.prototype.getParent = function getParent () {
    return this._parent;
};

/**
 * Schedules the @{@link update} function of the node to be invoked on the next
 * frame (if no update during this frame has been scheduled already).
 * If the node is currently being updated (which means one of the requesters
 * invoked requestsUpdate while being updated itself), an update will be
 * scheduled on the next frame.
 *
 * @method requestUpdate
 *
 * @param  {Object} requester   If the requester has an `onUpdate` method, it
 *                              will be invoked during the next update phase of
 *                              the node.
 *
 * @return {Node} this
 */
Node.prototype.requestUpdate = function requestUpdate (requester) {
    if (this._inUpdate || !this.isMounted())
        return this.requestUpdateOnNextTick(requester);
    this._updateQueue.push(requester);
    if (!this._requestingUpdate) this._requestUpdate();
    return this;
};

/**
 * Schedules an update on the next tick. Similarily to @{@link requestUpdate},
 * `requestUpdateOnNextTick` schedules the node's `onUpdate` function to be
 * invoked on the frame after the next invocation on the node's onUpdate function.
 *
 * @method requestUpdateOnNextTick
 *
 * @param  {Object} requester   If the requester has an `onUpdate` method, it
 *                              will be invoked during the next update phase of
 *                              the node.
 *
 * @return {Node} this
 */
Node.prototype.requestUpdateOnNextTick = function requestUpdateOnNextTick (requester) {
    this._nextUpdateQueue.push(requester);
    return this;
};

/**
 * Get the object responsible for updating this node.
 *
 * @method
 *
 * @return {Object} The global updater.
 */
Node.prototype.getUpdater = function getUpdater () {
    return this._globalUpdater;
};

/**
 * Checks if the node is mounted. Unmounted nodes are detached from the scene
 * graph.
 *
 * @method isMounted
 *
 * @return {Boolean}    Boolean indicating weather the node is mounted or not.
 */
Node.prototype.isMounted = function isMounted () {
    return this.value.showState.mounted;
};

/**
 * Checks if the node is visible ("shown").
 *
 * @method isShown
 *
 * @return {Boolean}    Boolean indicating weather the node is visible
 *                      ("shown") or not.
 */
Node.prototype.isShown = function isShown () {
    return this.value.showState.shown;
};

/**
 * Determines the node's relative opacity.
 * The opacity needs to be within [0, 1], where 0 indicates a completely
 * transparent, therefore invisible node, whereas an opacity of 1 means the
 * node is completely solid.
 *
 * @method getOpacity
 *
 * @return {Number}         Relative opacity of the node.
 */
Node.prototype.getOpacity = function getOpacity () {
    return this.value.showState.opacity;
};

/**
 * Determines the node's previously set mount point.
 *
 * @method getMountPoint
 *
 * @return {Float32Array}   An array representing the mount point.
 */
Node.prototype.getMountPoint = function getMountPoint () {
    return this.value.offsets.mountPoint;
};

/**
 * Determines the node's previously set align.
 *
 * @method getAlign
 *
 * @return {Float32Array}   An array representing the align.
 */
Node.prototype.getAlign = function getAlign () {
    return this.value.offsets.align;
};

/**
 * Determines the node's previously set origin.
 *
 * @method getOrigin
 *
 * @return {Float32Array}   An array representing the origin.
 */
Node.prototype.getOrigin = function getOrigin () {
    return this.value.offsets.origin;
};

/**
 * Determines the node's previously set position.
 *
 * @method getPosition
 *
 * @return {Float32Array}   An array representing the position.
 */
Node.prototype.getPosition = function getPosition () {
    return this.value.vectors.position;
};

/**
 * Returns the node's current rotation
 *
 * @method getRotation
 *
 * @return {Float32Array} an array of four values, showing the rotation as a quaternion
 */
Node.prototype.getRotation = function getRotation () {
    return this.value.vectors.rotation;
};

/**
 * Returns the scale of the node
 *
 * @method
 *
 * @return {Float32Array} an array showing the current scale vector
 */
Node.prototype.getScale = function getScale () {
    return this.value.vectors.scale;
};

/**
 * Returns the current size mode of the node
 *
 * @method
 *
 * @return {Float32Array} an array of numbers showing the current size mode
 */
Node.prototype.getSizeMode = function getSizeMode () {
    return this.value.size.sizeMode;
};

/**
 * Returns the current proportional size
 *
 * @method
 *
 * @return {Float32Array} a vector 3 showing the current proportional size
 */
Node.prototype.getProportionalSize = function getProportionalSize () {
    return this.value.size.proportional;
};

/**
 * Returns the differential size of the node
 *
 * @method
 *
 * @return {Float32Array} a vector 3 showing the current differential size
 */
Node.prototype.getDifferentialSize = function getDifferentialSize () {
    return this.value.size.differential;
};

/**
 * Returns the absolute size of the node
 *
 * @method
 *
 * @return {Float32Array} a vector 3 showing the current absolute size of the node
 */
Node.prototype.getAbsoluteSize = function getAbsoluteSize () {
    return this.value.size.absolute;
};

/**
 * Returns the current Render Size of the node. Note that the render size
 * is asynchronous (will always be one frame behind) and needs to be explicitely
 * calculated by setting the proper size mode.
 *
 * @method
 *
 * @return {Float32Array} a vector 3 showing the current render size
 */
Node.prototype.getRenderSize = function getRenderSize () {
    return this.value.size.render;
};

/**
 * Returns the external size of the node
 *
 * @method
 *
 * @return {Float32Array} a vector 3 of the final calculated side of the node
 */
Node.prototype.getSize = function getSize () {
    return this._calculatedValues.size;
};

/**
 * Returns the current world transform of the node
 *
 * @method
 *
 * @return {Float32Array} a 16 value transform
 */
Node.prototype.getTransform = function getTransform () {
    return this._calculatedValues.transform;
};

/**
 * Get the list of the UI Events that are currently associated with this node
 *
 * @method
 *
 * @return {Array} an array of strings representing the current subscribed UI event of this node
 */
Node.prototype.getUIEvents = function getUIEvents () {
    return this.value.UIEvents;
};

/**
 * Adds a new child to this node. If this method is called with no argument it will
 * create a new node, however it can also be called with an existing node which it will
 * append to the node that this method is being called on. Returns the new or passed in node.
 *
 * @method
 *
 * @param {Node | void} child the node to appended or no node to create a new node.
 *
 * @return {Node} the appended node.
 */
Node.prototype.addChild = function addChild (child) {
    var index = child ? this._children.indexOf(child) : -1;
    child = child ? child : new Node();

    if (index === -1) {
        index = this._freedChildIndicies.length ? this._freedChildIndicies.pop() : this._children.length;
        this._children[index] = child;

        if (this.isMounted() && child.onMount) {
            var myId = this.getId();
            var childId = myId + '/' + index;
            child.onMount(this, childId);
        }

    }

    return child;
};

/**
 * Removes a child node from another node. The passed in node must be
 * a child of the node that this method is called upon.
 *
 * @method
 *
 * @param {Node} child node to be removed
 *
 * @return {Boolean} whether or not the node was successfully removed
 */
Node.prototype.removeChild = function removeChild (child) {
    var index = this._children.indexOf(child);
    var added = index !== -1;
    if (added) {
        this._freedChildIndicies.push(index);

        this._children[index] = null;

        if (this.isMounted() && child.onDismount)
            child.onDismount();
    }
    return added;
};

/**
 * Each component can only be added once per node.
 *
 * @method addComponent
 *
 * @param {Object} component    An component to be added.
 * @return {Number} index       The index at which the component has been
 *                              registered. Indices aren't necessarily
 *                              consecutive.
 */
Node.prototype.addComponent = function addComponent (component) {
    var index = this._components.indexOf(component);
    if (index === -1) {
        index = this._freedComponentIndicies.length ? this._freedComponentIndicies.pop() : this._components.length;
        this._components[index] = component;

        if (this.isMounted() && component.onMount)
            component.onMount(this, index);

        if (this.isShown() && component.onShow)
            component.onShow();
    }

    return index;
};

/**
 * @method  getComponent
 *
 * @param  {Number} index   Index at which the component has been regsitered
 *                          (using `Node#addComponent`).
 * @return {*}              The component registered at the passed in index (if
 *                          any).
 */
Node.prototype.getComponent = function getComponent (index) {
    return this._components[index];
};

/**
 * Removes a previously via @{@link addComponent} added component.
 *
 * @method removeComponent
 *
 * @param  {Object} component   An component that has previously been added
 *                              using @{@link addComponent}.
 *
 * @return {Node} this
 */
Node.prototype.removeComponent = function removeComponent (component) {
    var index = this._components.indexOf(component);
    if (index !== -1) {
        this._freedComponentIndicies.push(index);
        if (this.isShown() && component.onHide)
            component.onHide();

        if (this.isMounted() && component.onDismount)
            component.onDismount();

        this._components[index] = null;
    }
    return component;
};

/**
 * Subscribes a node to a UI Event. All components on the node
 * will have the opportunity to begin listening to that event
 * and alerting the scene graph.
 *
 * @method
 *
 * @param {String} eventName the name of the event
 *
 * @return {undefined} undefined
 */
Node.prototype.addUIEvent = function addUIEvent (eventName) {
    var UIEvents = this.getUIEvents();
    var components = this._components;
    var component;

    var added = UIEvents.indexOf(eventName) !== -1;
    if (!added) {
        UIEvents.push(eventName);
        for (var i = 0, len = components.length ; i < len ; i++) {
            component = components[i];
            if (component && component.onAddUIEvent) component.onAddUIEvent(eventName);
        }
    }
};

/**
 * Private method for the Node to request an update for itself.
 *
 * @method
 * @private
 *
 * @param {Boolean} force whether or not to force the update
 *
 * @return {undefined} undefined
 */
Node.prototype._requestUpdate = function _requestUpdate (force) {
    if (force || (!this._requestingUpdate && this._globalUpdater)) {
        this._globalUpdater.requestUpdate(this);
        this._requestingUpdate = true;
    }
};

/**
 * Private method to set an optional value in an array, and
 * request an update if this changes the value of the array.
 *
 * @method
 *
 * @param {Array} vec the array to insert the value into
 * @param {Number} index the index at which to insert the value
 * @param {Any} val the value to potentially insert (if not null or undefined)
 *
 * @return {Boolean} whether or not a new value was inserted.
 */
Node.prototype._vecOptionalSet = function _vecOptionalSet (vec, index, val) {
    if (val != null && vec[index] !== val) {
        vec[index] = val;
        if (!this._requestingUpdate) this._requestUpdate();
        return true;
    }
    return false;
};

/**
 * Shows the node, which is to say, calls onShow on all of the
 * node's components. Renderable components can then issue the
 * draw commands necessary to be shown.
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.show = function show () {
    var i = 0;
    var items = this._components;
    var len = items.length;
    var item;

    this.value.showState.shown = true;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onShow) item.onShow();
    }

    i = 0;
    items = this._children;
    len = items.length;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onParentShow) item.onParentShow();
    }
    return this;
};

/**
 * Hides the node, which is to say, calls onHide on all of the
 * node's components. Renderable components can then issue
 * the draw commands necessary to be hidden
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.hide = function hide () {
    var i = 0;
    var items = this._components;
    var len = items.length;
    var item;

    this.value.showState.shown = false;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onHide) item.onHide();
    }

    i = 0;
    items = this._children;
    len = items.length;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onParentHide) item.onParentHide();
    }
    return this;
};

/**
 * Sets the align value of the node. Will call onAlignChange
 * on all of the Node's components.
 *
 * @method
 *
 * @param {Number} x Align value in the x dimension.
 * @param {Number} y Align value in the y dimension.
 * @param {Number} z Align value in the z dimension.
 *
 * @return {Node} this
 */
Node.prototype.setAlign = function setAlign (x, y, z) {
    var vec3 = this.value.offsets.align;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    if (z != null) propogate = this._vecOptionalSet(vec3, 2, (z - 0.5)) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onAlignChange) item.onAlignChange(x, y, z);
        }
    }
    return this;
};

/**
 * Sets the mount point value of the node. Will call onMountPointChange
 * on all of the node's components.
 *
 * @method
 *
 * @param {Number} x MountPoint value in x dimension
 * @param {Number} y MountPoint value in y dimension
 * @param {Number} z MountPoint value in z dimension
 *
 * @return {Node} this
 */
Node.prototype.setMountPoint = function setMountPoint (x, y, z) {
    var vec3 = this.value.offsets.mountPoint;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    if (z != null) propogate = this._vecOptionalSet(vec3, 2, (z - 0.5)) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onMountPointChange) item.onMountPointChange(x, y, z);
        }
    }
    return this;
};

/**
 * Sets the origin value of the node. Will call onOriginChange
 * on all of the node's components.
 *
 * @method
 *
 * @param {Number} x Origin value in x dimension
 * @param {Number} y Origin value in y dimension
 * @param {Number} z Origin value in z dimension
 *
 * @return {Node} this
 */
Node.prototype.setOrigin = function setOrigin (x, y, z) {
    var vec3 = this.value.offsets.origin;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    if (z != null) propogate = this._vecOptionalSet(vec3, 2, (z - 0.5)) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onOriginChange) item.onOriginChange(x, y, z);
        }
    }
    return this;
};

/**
 * Sets the position of the node. Will call onPositionChange
 * on all of the node's components.
 *
 * @method
 *
 * @param {Number} x Position in x
 * @param {Number} y Position in y
 * @param {Number} z Position in z
 *
 * @return {Node} this
 */
Node.prototype.setPosition = function setPosition (x, y, z) {
    var vec3 = this.value.vectors.position;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onPositionChange) item.onPositionChange(x, y, z);
        }
    }

    return this;
};

/**
 * Sets the rotation of the node. Will call onRotationChange
 * on all of the node's components. This method takes either
 * Euler angles or a quaternion. If the fourth argument is undefined
 * Euler angles are assumed.
 *
 * @method
 *
 * @param {Number} x Either the rotation around the x axis or the magnitude in x of the axis of rotation.
 * @param {Number} y Either the rotation around the y axis or the magnitude in y of the axis of rotation.
 * @param {Number} z Either the rotation around the z axis or the magnitude in z of the axis of rotation.
 * @param {Number|undefined} w the amount of rotation around the axis of rotation, if a quaternion is specified.
 *
 * @return {undefined} undefined
 */
Node.prototype.setRotation = function setRotation (x, y, z, w) {
    var quat = this.value.vectors.rotation;
    var propogate = false;
    var qx, qy, qz, qw;

    if (w != null) {
        qx = x;
        qy = y;
        qz = z;
        qw = w;
        this._lastEulerX = null;
        this._lastEulerY = null;
        this._lastEulerZ = null;
        this._lastEuler = false;
    }
    else {
        if (x == null || y == null || z == null) {
            if (this._lastEuler) {
                x = x == null ? this._lastEulerX : x;
                y = y == null ? this._lastEulerY : y;
                z = z == null ? this._lastEulerZ : z;
            }
            else {
                var sp = -2 * (quat[1] * quat[2] - quat[3] * quat[0]);

                if (Math.abs(sp) > 0.99999) {
                    y = y == null ? Math.PI * 0.5 * sp : y;
                    x = x == null ? Math.atan2(-quat[0] * quat[2] + quat[3] * quat[1], 0.5 - quat[1] * quat[1] - quat[2] * quat[2]) : x;
                    z = z == null ? 0 : z;
                }
                else {
                    y = y == null ? Math.asin(sp) : y;
                    x = x == null ? Math.atan2(quat[0] * quat[2] + quat[3] * quat[1], 0.5 - quat[0] * quat[0] - quat[1] * quat[1]) : x;
                    z = z == null ? Math.atan2(quat[0] * quat[1] + quat[3] * quat[2], 0.5 - quat[0] * quat[0] - quat[2] * quat[2]) : z;
                }
            }
        }

        var hx = x * 0.5;
        var hy = y * 0.5;
        var hz = z * 0.5;

        var sx = Math.sin(hx);
        var sy = Math.sin(hy);
        var sz = Math.sin(hz);
        var cx = Math.cos(hx);
        var cy = Math.cos(hy);
        var cz = Math.cos(hz);

        var sysz = sy * sz;
        var cysz = cy * sz;
        var sycz = sy * cz;
        var cycz = cy * cz;

        qx = sx * cycz + cx * sysz;
        qy = cx * sycz - sx * cysz;
        qz = cx * cysz + sx * sycz;
        qw = cx * cycz - sx * sysz;

        this._lastEuler = true;
        this._lastEulerX = x;
        this._lastEulerY = y;
        this._lastEulerZ = z;
    }

    propogate = this._vecOptionalSet(quat, 0, qx) || propogate;
    propogate = this._vecOptionalSet(quat, 1, qy) || propogate;
    propogate = this._vecOptionalSet(quat, 2, qz) || propogate;
    propogate = this._vecOptionalSet(quat, 3, qw) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = quat[0];
        y = quat[1];
        z = quat[2];
        w = quat[3];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onRotationChange) item.onRotationChange(x, y, z, w);
        }
    }
    return this;
};

/**
 * Sets the scale of the node. The default value is 1 in all dimensions.
 * The node's components will have onScaleChanged called on them.
 *
 * @method
 *
 * @param {Number} x Scale value in x
 * @param {Number} y Scale value in y
 * @param {Number} z Scale value in z
 *
 * @return {Node} this
 */
Node.prototype.setScale = function setScale (x, y, z) {
    var vec3 = this.value.vectors.scale;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onScaleChange) item.onScaleChange(x, y, z);
        }
    }
    return this;
};

/**
 * Sets the value of the opacity of this node. All of the node's
 * components will have onOpacityChange called on them/
 *
 * @method
 *
 * @param {Number} val Value of the opacity. 1 is the default.
 *
 * @return {Node} this
 */
Node.prototype.setOpacity = function setOpacity (val) {
    if (val !== this.value.showState.opacity) {
        this.value.showState.opacity = val;
        if (!this._requestingUpdate) this._requestUpdate();

        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onOpacityChange) item.onOpacityChange(val);
        }
    }
    return this;
};

/**
 * Sets the size mode being used for determining the nodes final width, height
 * and depth.
 * Size modes are a way to define the way the node's size is being calculated.
 * Size modes are enums set on the @{@link Size} constructor (and aliased on
 * the Node).
 *
 * @example
 * node.setSizeMode(Node.RELATIVE_SIZE, Node.ABSOLUTE_SIZE, Node.ABSOLUTE_SIZE);
 * // Instead of null, any proporional height or depth can be passed in, since
 * // it would be ignored in any case.
 * node.setProportionalSize(0.5, null, null);
 * node.setAbsoluteSize(null, 100, 200);
 *
 * @method setSizeMode
 *
 * @param {SizeMode} x    The size mode being used for determining the size in
 *                        x direction ("width").
 * @param {SizeMode} y    The size mode being used for determining the size in
 *                        y direction ("height").
 * @param {SizeMode} z    The size mode being used for determining the size in
 *                        z direction ("depth").
 *
 * @return {Node} this
 */
Node.prototype.setSizeMode = function setSizeMode (x, y, z) {
    var vec3 = this.value.size.sizeMode;
    var propogate = false;

    if (x != null) propogate = this._resolveSizeMode(vec3, 0, x) || propogate;
    if (y != null) propogate = this._resolveSizeMode(vec3, 1, y) || propogate;
    if (z != null) propogate = this._resolveSizeMode(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onSizeModeChange) item.onSizeModeChange(x, y, z);
        }
    }
    return this;
};

/**
 * A protected method that resolves string representations of size mode
 * to numeric values and applies them.
 *
 * @method
 *
 * @param {Array} vec the array to write size mode to
 * @param {Number} index the index to write to in the array
 * @param {String|Number} val the value to write
 *
 * @return {Bool} whether or not the sizemode has been changed for this index.
 */
Node.prototype._resolveSizeMode = function _resolveSizeMode (vec, index, val) {
    if (val.constructor === String) {
        switch (val.toLowerCase()) {
            case 'relative':
            case 'default':
                return this._vecOptionalSet(vec, index, 0);
            case 'absolute':
                return this._vecOptionalSet(vec, index, 1);
            case 'render':
                return this._vecOptionalSet(vec, index, 2);
            default: throw new Error('unknown size mode: ' + val);
        }
    }
    else return this._vecOptionalSet(vec, index, val);
};

/**
 * A proportional size defines the node's dimensions relative to its parents
 * final size.
 * Proportional sizes need to be within the range of [0, 1].
 *
 * @method setProportionalSize
 *
 * @param {Number} x    x-Size in pixels ("width").
 * @param {Number} y    y-Size in pixels ("height").
 * @param {Number} z    z-Size in pixels ("depth").
 *
 * @return {Node} this
 */
Node.prototype.setProportionalSize = function setProportionalSize (x, y, z) {
    var vec3 = this.value.size.proportional;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onProportionalSizeChange) item.onProportionalSizeChange(x, y, z);
        }
    }
    return this;
};

/**
 * Differential sizing can be used to add or subtract an absolute size from a
 * otherwise proportionally sized node.
 * E.g. a differential width of `-10` and a proportional width of `0.5` is
 * being interpreted as setting the node's size to 50% of its parent's width
 * *minus* 10 pixels.
 *
 * @method setDifferentialSize
 *
 * @param {Number} x    x-Size to be added to the relatively sized node in
 *                      pixels ("width").
 * @param {Number} y    y-Size to be added to the relatively sized node in
 *                      pixels ("height").
 * @param {Number} z    z-Size to be added to the relatively sized node in
 *                      pixels ("depth").
 *
 * @return {Node} this
 */
Node.prototype.setDifferentialSize = function setDifferentialSize (x, y, z) {
    var vec3 = this.value.size.differential;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onDifferentialSizeChange) item.onDifferentialSizeChange(x, y, z);
        }
    }
    return this;
};

/**
 * Sets the nodes size in pixels, independent of its parent.
 *
 * @method setAbsoluteSize
 *
 * @param {Number} x    x-Size in pixels ("width").
 * @param {Number} y    y-Size in pixels ("height").
 * @param {Number} z    z-Size in pixels ("depth").
 *
 * @return {Node} this
 */
Node.prototype.setAbsoluteSize = function setAbsoluteSize (x, y, z) {
    var vec3 = this.value.size.absolute;
    var propogate = false;

    propogate = this._vecOptionalSet(vec3, 0, x) || propogate;
    propogate = this._vecOptionalSet(vec3, 1, y) || propogate;
    propogate = this._vecOptionalSet(vec3, 2, z) || propogate;

    if (propogate) {
        var i = 0;
        var list = this._components;
        var len = list.length;
        var item;
        x = vec3[0];
        y = vec3[1];
        z = vec3[2];
        for (; i < len ; i++) {
            item = list[i];
            if (item && item.onAbsoluteSizeChange) item.onAbsoluteSizeChange(x, y, z);
        }
    }
    return this;
};

/**
 * Private method for alerting all components and children that
 * this node's transform has changed.
 *
 * @method
 *
 * @param {Float32Array} transform The transform that has changed
 *
 * @return {undefined} undefined
 */
Node.prototype._transformChanged = function _transformChanged (transform) {
    var i = 0;
    var items = this._components;
    var len = items.length;
    var item;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onTransformChange) item.onTransformChange(transform);
    }

    i = 0;
    items = this._children;
    len = items.length;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onParentTransformChange) item.onParentTransformChange(transform);
    }
};

/**
 * Private method for alerting all components and children that
 * this node's size has changed.
 *
 * @method
 *
 * @param {Float32Array} size the size that has changed
 *
 * @return {undefined} undefined
 */
Node.prototype._sizeChanged = function _sizeChanged (size) {
    var i = 0;
    var items = this._components;
    var len = items.length;
    var item;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onSizeChange) item.onSizeChange(size);
    }

    i = 0;
    items = this._children;
    len = items.length;

    for (; i < len ; i++) {
        item = items[i];
        if (item && item.onParentSizeChange) item.onParentSizeChange(size);
    }
};

/**
 * Method for getting the current frame. Will be depricated.
 *
 * @method
 *
 * @return {Number} current frame
 */
Node.prototype.getFrame = function getFrame () {
    return this._globalUpdater.getFrame();
};

/**
 * returns an array of the components currently attached to this
 * node.
 *
 * @method getComponents
 *
 * @return {Array} list of components.
 */
Node.prototype.getComponents = function getComponents () {
    return this._components;
};

/**
 * Enters the node's update phase while updating its own spec and updating its components.
 *
 * @method update
 *
 * @param  {Number} time    high-resolution timstamp, usually retrieved using
 *                          requestAnimationFrame
 *
 * @return {Node} this
 */
Node.prototype.update = function update (time){
    this._inUpdate = true;
    var nextQueue = this._nextUpdateQueue;
    var queue = this._updateQueue;
    var item;

    while (nextQueue.length) queue.unshift(nextQueue.pop());

    while (queue.length) {
        item = this._components[queue.shift()];
        if (item && item.onUpdate) item.onUpdate(time);
    }

    var mySize = this.getSize();
    var myTransform = this.getTransform();
    var parent = this.getParent();
    var parentSize = parent.getSize();
    var parentTransform = parent.getTransform();
    var sizeChanged = SIZE_PROCESSOR.fromSpecWithParent(parentSize, this, mySize);

    var transformChanged = TRANSFORM_PROCESSOR.fromSpecWithParent(parentTransform, this.value, mySize, parentSize, myTransform);
    if (transformChanged) this._transformChanged(myTransform);
    if (sizeChanged) this._sizeChanged(mySize);

    this._inUpdate = false;
    this._requestingUpdate = false;

    if (!this.isMounted()) {
        // last update
        this._parent = null;
        this.value.location = null;
        this._globalUpdater = null;
    }
    else if (this._nextUpdateQueue.length) {
        this._globalUpdater.requestUpdateOnNextTick(this);
        this._requestingUpdate = true;
    }
    return this;
};

/**
 * Mounts the node and therefore its subtree by setting it as a child of the
 * passed in parent.
 *
 * @method mount
 *
 * @param  {Node} parent    parent node
 * @param  {String} myId    path to node (e.g. `body/0/1`)
 *
 * @return {Node} this
 */
Node.prototype.mount = function mount (parent, myId) {
    if (this.isMounted()) return this;
    var i = 0;
    var list = this._components;
    var len = list.length;
    var item;

    this._parent = parent;
    this._globalUpdater = parent.getUpdater();
    this.value.location = myId;
    this.value.showState.mounted = true;

    for (; i < len ; i++) {
        item = list[i];
        if (item && item.onMount) item.onMount(this, i);
    }

    i = 0;
    list = this._children;
    len = list.length;
    for (; i < len ; i++) {
        item = list[i];
        if (item && item.onParentMount) item.onParentMount(this, myId, i);
    }

    if (!this._requestingUpdate) this._requestUpdate(true);
    return this;
};

/**
 * Dismounts (detaches) the node from the scene graph by removing it as a
 * child of its parent.
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.dismount = function dismount () {
    if (!this.isMounted()) return this;
    var i = 0;
    var list = this._components;
    var len = list.length;
    var item;

    this.value.showState.mounted = false;

    this._parent.removeChild(this);

    for (; i < len ; i++) {
        item = list[i];
        if (item && item.onDismount) item.onDismount();
    }

    i = 0;
    list = this._children;
    len = list.length;
    for (; i < len ; i++) {
        item = list[i];
        if (item && item.onParentDismount) item.onParentDismount();
    }

    if (!this._requestingUpdate) this._requestUpdate();
    return this;
};

/**
 * Function to be invoked by the parent as soon as the parent is
 * being mounted.
 *
 * @method onParentMount
 *
 * @param  {Node} parent        The parent node.
 * @param  {String} parentId    The parent id (path to parent).
 * @param  {Number} index       Id the node should be mounted to.
 *
 * @return {Node} this
 */
Node.prototype.onParentMount = function onParentMount (parent, parentId, index) {
    return this.mount(parent, parentId + '/' + index);
};

/**
 * Function to be invoked by the parent as soon as the parent is being
 * unmounted.
 *
 * @method onParentDismount
 *
 * @return {Node} this
 */
Node.prototype.onParentDismount = function onParentDismount () {
    return this.dismount();
};

/**
 * Method to be called in order to dispatch an event to the node and all its
 * components. Note that this doesn't recurse the subtree.
 *
 * @method receive
 *
 * @param  {String} type   The event type (e.g. "click").
 * @param  {Object} ev     The event payload object to be dispatched.
 *
 * @return {Node} this
 */
Node.prototype.receive = function receive (type, ev) {
    var i = 0;
    var list = this._components;
    var len = list.length;
    var item;
    for (; i < len ; i++) {
        item = list[i];
        if (item && item.onReceive) item.onReceive(type, ev);
    }
    return this;
};


/**
 * Private method to avoid accidentally passing arguments
 * to update events.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Node.prototype._requestUpdateWithoutArgs = function _requestUpdateWithoutArgs () {
    if (!this._requestingUpdate) this._requestUpdate();
};

/**
 * A method to execute logic on update. Defaults to the
 * node's .update method.
 *
 * @method
 *
 * @param {Number} current time
 *
 * @return {undefined} undefined
 */
Node.prototype.onUpdate = Node.prototype.update;

/**
 * A method to execute logic when a parent node is shown. Delegates
 * to Node.show.
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.onParentShow = Node.prototype.show;

/**
 * A method to execute logic when the parent is hidden. Delegates
 * to Node.hide.
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.onParentHide = Node.prototype.hide;

/**
 * A method to execute logic when the parent transform changes.
 * Delegates to Node._requestUpdateWithoutArgs.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Node.prototype.onParentTransformChange = Node.prototype._requestUpdateWithoutArgs;

/**
 * A method to execute logic when the parent size changes.
 * Delegates to Node._requestUpdateWIthoutArgs.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Node.prototype.onParentSizeChange = Node.prototype._requestUpdateWithoutArgs;

/**
 * A method to execute logic when the node something wants
 * to show the node. Delegates to Node.show.
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.onShow = Node.prototype.show;

/**
 * A method to execute logic when something wants to hide this
 * node. Delegates to Node.hide.
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.onHide = Node.prototype.hide;

/**
 * A method which can execute logic when this node is added to
 * to the scene graph. Delegates to mount.
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.onMount = Node.prototype.mount;

/**
 * A method which can execute logic when this node is removed from
 * the scene graph. Delegates to Node.dismount.
 *
 * @method
 *
 * @return {Node} this
 */
Node.prototype.onDismount = Node.prototype.dismount;

/**
 * A method which can execute logic when this node receives
 * an event from the scene graph. Delegates to Node.receive.
 *
 * @method
 *
 * @param {String} event name
 * @param {Object} payload
 *
 * @return {undefined} undefined
 */
Node.prototype.onReceive = Node.prototype.receive;

module.exports = Node;

},{"./Size":9,"./Transform":10}],8:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*jshint -W079 */

'use strict';

var Dispatch = require('./Dispatch');
var Node = require('./Node');
var Size = require('./Size');

/**
 * Scene is the bottom of the scene graph. It is it's own
 * parent and provides the global updater to the scene graph.
 *
 * @class Scene
 * @constructor
 *
 * @param {String} selector a string which is a dom selector
 *                 signifying which dom element the context
 *                 should be set upon
 * @param {Famous} updater a class which conforms to Famous' interface
 *                 it needs to be able to send methods to
 *                 the renderers and update nodes in the scene graph
 */
function Scene (selector, updater) {
    if (!selector) throw new Error('Scene needs to be created with a DOM selector');
    if (!updater) throw new Error('Scene needs to be created with a class like Famous');

    Node.call(this);         // Scene inherits from node

    this._updater = updater; // The updater that will both
                             // send messages to the renderers
                             // and update dirty nodes 

    this._dispatch = new Dispatch(this); // instantiates a dispatcher
                                         // to send events to the scene
                                         // graph below this context
    
    this._selector = selector; // reference to the DOM selector
                               // that represents the elemnent
                               // in the dom that this context
                               // inhabits

    this.onMount(this, selector); // Mount the context to itself
                                  // (it is its own parent)
    
    this._updater                  // message a request for the dom
        .message('NEED_SIZE_FOR')  // size of the context so that
        .message(selector);        // the scene graph has a total size

    this.show(); // the context begins shown (it's already present in the dom)

}

// Scene inherits from node
Scene.prototype = Object.create(Node.prototype);
Scene.prototype.constructor = Scene;

/**
 * Scene getUpdater function returns the passed in updater
 *
 * @return {Famous} the updater for this Scene
 */
Scene.prototype.getUpdater = function getUpdater () {
    return this._updater;
};

/**
 * Returns the selector that the context was instantiated with
 *
 * @return {String} dom selector
 */
Scene.prototype.getSelector = function getSelector () {
    return this._selector;
};

/**
 * Returns the dispatcher of the context. Used to send events
 * to the nodes in the scene graph.
 *
 * @return {Dispatch} the Scene's Dispatch
 */
Scene.prototype.getDispatch = function getDispatch () {
    return this._dispatch;
};

/**
 * Receives an event. If the event is 'CONTEXT_RESIZE' it sets the size of the scene
 * graph to the payload, which must be an array of numbers of at least
 * length three representing the pixel size in 3 dimensions.
 *
 * @param {String} event the name of the event being received
 * @param {*} payload the object being sent
 *
 * @return {undefined} undefined
 */
Scene.prototype.onReceive = function onReceive (event, payload) {
    // TODO: In the future the dom element that the context is attached to
    // should have a representation as a component. It would be render sized
    // and the context would receive its size the same way that any render size
    // component receives its size.
    if (event === 'CONTEXT_RESIZE') {
        
        if (payload.length < 2) 
            throw new Error(
                    'CONTEXT_RESIZE\'s payload needs to be at least a pair' +
                    ' of pixel sizes'
            );

        this.setSizeMode(Size.ABSOLUTE, Size.ABSOLUTE, Size.ABSOLUTE);
        this.setAbsoluteSize(payload[0],
                             payload[1],
                             payload[2] ? payload[2] : 0);

    }
};

module.exports = Scene;


},{"./Dispatch":4,"./Node":7,"./Size":9}],9:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * The Size class is responsible for processing Size from a node
 * @constructor Size
 */
function Size () {
    this._size = new Float32Array(3);
}

// an enumeration of the different types of size modes
Size.RELATIVE = 0;
Size.ABSOLUTE = 1;
Size.RENDER = 2;
Size.DEFAULT = Size.RELATIVE;

/**
 * fromSpecWithParent takes the parent node's size, the target nodes spec,
 * and a target array to write to. Using the node's size mode it calculates 
 * a final size for the node from the node's spec. Returns whether or not
 * the final size has changed from its last value.
 *
 * @param {Array} parentSize parent node's calculated size
 * @param {Node.Spec} node the target node's spec
 * @param {Array} target an array to write the result to
 *
 * @return {Boolean} true if the size of the node has changed.
 */
Size.prototype.fromSpecWithParent = function fromSpecWithParent (parentSize, node, target) {
    var spec = node.getValue().spec;
    var components = node.getComponents();
    var mode = spec.size.sizeMode;
    var prev;
    var changed = false;
    var len = components.length;
    var j;
    for (var i = 0 ; i < 3 ; i++) {
        switch (mode[i]) {
            case Size.RELATIVE:
                prev = target[i];
                target[i] = parentSize[i] * spec.size.proportional[i] + spec.size.differential[i];
                break;
            case Size.ABSOLUTE:
                prev = target[i];
                target[i] = spec.size.absolute[i];
                break;
            case Size.RENDER:
                var candidate;
                for (j = 0; j < len ; j++) {
                    if (components[j].getRenderSize) {
                        candidate = components[j].getRenderSize()[i];
                        prev = target[i];
                        target[i] = target[i] < candidate || target[i] === 0 ? candidate : target[i];
                    }
                }
                break;
        }
        changed = changed || prev !== target[i];
    }
    return changed;
};

module.exports = Size;

},{}],10:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * The transform class is responsible for calculating the transform of a particular
 * node from the data on the node and its parent
 *
 * @constructor Transform
 */
function Transform () {
    this._matrix = new Float32Array(16);
}

/**
 * Returns the last calculated transform
 *
 * @return {Array} a transform
 */
Transform.prototype.get = function get () {
    return this._matrix;
};

/**
 * Uses the parent transform, the node's spec, the node's size, and the parent's size
 * to calculate a final transform for the node. Returns true if the transform has changed.
 *
 * @param {Array} parentMatrix the parent matrix
 * @param {Node.Spec} spec the target node's spec
 * @param {Array} mySize the size of the node
 * @param {Array} parentSize the size of the parent
 * @param {Array} target the target array to write the resulting transform to
 *
 * @return {Boolean} whether or not the transform changed
 */
Transform.prototype.fromSpecWithParent = function fromSpecWithParent (parentMatrix, spec, mySize, parentSize, target) {
    target = target ? target : this._matrix;

    // local cache of everything
    var t00         = target[0];
    var t01         = target[1];
    var t02         = target[2];
    var t10         = target[4];
    var t11         = target[5];
    var t12         = target[6];
    var t20         = target[8];
    var t21         = target[9];
    var t22         = target[10];
    var t30         = target[12];
    var t31         = target[13];
    var t32         = target[14];
    var p00         = parentMatrix[0];
    var p01         = parentMatrix[1];
    var p02         = parentMatrix[2];
    var p10         = parentMatrix[4];
    var p11         = parentMatrix[5];
    var p12         = parentMatrix[6];
    var p20         = parentMatrix[8];
    var p21         = parentMatrix[9];
    var p22         = parentMatrix[10];
    var p30         = parentMatrix[12];
    var p31         = parentMatrix[13];
    var p32         = parentMatrix[14];
    var posX        = spec.vectors.position[0];
    var posY        = spec.vectors.position[1];
    var posZ        = spec.vectors.position[2];
    var rotX        = spec.vectors.rotation[0];
    var rotY        = spec.vectors.rotation[1];
    var rotZ        = spec.vectors.rotation[2];
    var rotW        = spec.vectors.rotation[3];
    var scaleX      = spec.vectors.scale[0];
    var scaleY      = spec.vectors.scale[1];
    var scaleZ      = spec.vectors.scale[2];
    var alignX      = spec.offsets.align[0] * parentSize[0];
    var alignY      = spec.offsets.align[1] * parentSize[1];
    var alignZ      = spec.offsets.align[2] * parentSize[2];
    var mountPointX = spec.offsets.mountPoint[0] * mySize[0];
    var mountPointY = spec.offsets.mountPoint[1] * mySize[1];
    var mountPointZ = spec.offsets.mountPoint[2] * mySize[2];
    var originX     = spec.offsets.origin[0] * mySize[0];
    var originY     = spec.offsets.origin[1] * mySize[1];
    var originZ     = spec.offsets.origin[2] * mySize[2];

    var wx = rotW * rotX;
    var wy = rotW * rotY;
    var wz = rotW * rotZ;
    var xx = rotX * rotX;
    var yy = rotY * rotY;
    var zz = rotZ * rotZ;
    var xy = rotX * rotY;
    var xz = rotX * rotZ;
    var yz = rotY * rotZ;

    var rs0 = (1 - 2 * (yy + zz)) * scaleX;
    var rs1 = (2 * (xy + wz)) * scaleX;
    var rs2 = (2 * (xz - wy)) * scaleX;
    var rs3 = (2 * (xy - wz)) * scaleY;
    var rs4 = (1 - 2 * (xx + zz)) * scaleY;
    var rs5 = (2 * (yz + wx)) * scaleY;
    var rs6 = (2 * (xz + wy)) * scaleZ;
    var rs7 = (2 * (yz - wx)) * scaleZ;
    var rs8 = (1 - 2 * (xx + yy)) * scaleZ;

    var tx = alignX + posX - mountPointX + originX - (rs0 * originX + rs3 * originY + rs6 * originZ);
    var ty = alignY + posY - mountPointY + originY - (rs1 * originX + rs4 * originY + rs7 * originZ);
    var tz = alignZ + posZ - mountPointZ + originZ - (rs2 * originX + rs5 * originY + rs8 * originZ);

    target[0] = p00 * rs0 + p10 * rs1 + p20 * rs2;
    target[1] = p01 * rs0 + p11 * rs1 + p21 * rs2;
    target[2] = p02 * rs0 + p12 * rs1 + p22 * rs2;
    target[3] = 0;
    target[4] = p00 * rs3 + p10 * rs4 + p20 * rs5;
    target[5] = p01 * rs3 + p11 * rs4 + p21 * rs5;
    target[6] = p02 * rs3 + p12 * rs4 + p22 * rs5;
    target[7] = 0;
    target[8] = p00 * rs6 + p10 * rs7 + p20 * rs8;
    target[9] = p01 * rs6 + p11 * rs7 + p21 * rs8;
    target[10] = p02 * rs6 + p12 * rs7 + p22 * rs8;
    target[11] = 0;
    target[12] = p00 * tx + p10 * ty + p20 * tz + p30;
    target[13] = p01 * tx + p11 * ty + p21 * tz + p31;
    target[14] = p02 * tx + p12 * ty + p22 * tz + p32;
    target[15] = 1;

    return t00 !== target[0] ||
        t01 !== target[1] ||
        t02 !== target[2] ||
        t10 !== target[4] ||
        t11 !== target[5] ||
        t12 !== target[6] ||
        t20 !== target[8] ||
        t21 !== target[9] ||
        t22 !== target[10] ||
        t30 !== target[12] ||
        t31 !== target[13] ||
        t32 !== target[14];

};

module.exports = Transform;

},{}],11:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var CallbackStore = require('../utilities/CallbackStore');

var RENDER_SIZE = 2;

/**
 * A DOMElement is a component that can be added to a Node with the
 * purpose of sending draw commands to the renderer. Renderables send draw commands
 * to through their Nodes to the Compositor where they are acted upon.
 *
 * @class DOMElement
 *
 * @param {Node} node                   The Node to which the `DOMElement`
 *                                      renderable should be attached to.
 * @param {Object} options              Initial options used for instantiating
 *                                      the Node.
 * @param {Object} options.properties   CSS properties that should be added to
 *                                      the actual DOMElement on the initial draw.
 * @param {Object} options.attributes   Element attributes that should be added to
 *                                      the actual DOMElement.
 * @param {String} options.id           String to be applied as 'id' of the actual
 *                                      DOMElement.
 * @param {String} options.content      String to be applied as the content of the
 *                                      actual DOMElement.
 * @param {Boolean} options.cutout      Specifies the presence of a 'cutout' in the
 *                                      WebGL canvas over this element which allows
 *                                      for DOM and WebGL layering.  On by default.
 */
function DOMElement(node, options) {
    if (!node) throw new Error('DOMElement must be instantiated on a node');

    this._node = node;
    this._parent = null;
    this._children = [];

    this._requestingUpdate = false;
    this._renderSized = false;
    this._requestRenderSize = false;

    this._changeQueue = [];

    this._UIEvents = node.getUIEvents().slice(0);
    this._classes = ['famous-dom-element'];
    this._requestingEventListeners = [];
    this._styles = {};

    this.setProperty('display', node.isShown() ? 'none' : 'block');
    this.onOpacityChange(node.getOpacity());

    this._attributes = {};
    this._content = '';

    this._tagName = options && options.tagName ? options.tagName : 'div';
    this._id = node ? node.addComponent(this) : null;

    this._renderSize = [0, 0, 0];

    this._callbacks = new CallbackStore();


    if (!options) return;

    var i;
    var key;

    if (options.classes)
        for (i = 0; i < options.classes.length; i++)
            this.addClass(options.classes[i]);

    if (options.attributes)
        for (key in options.attributes)
            this.setAttribute(key, options.attributes[key]);

    if (options.properties)
        for (key in options.properties)
            this.setProperty(key, options.properties[key]);

    if (options.id) this.setId(options.id);
    if (options.content) this.setContent(options.content);
    if (options.cutout === false) this.setCutoutState(options.cutout);
}

/**
 * Serializes the state of the DOMElement.
 *
 * @method
 *
 * @return {Object} serialized interal state
 */
DOMElement.prototype.getValue = function getValue() {
    return {
        classes: this._classes,
        styles: this._styles,
        attributes: this._attributes,
        content: this._content,
        id: this._attributes.id,
        tagName: this._tagName
    };
};

/**
 * Method to be invoked by the node as soon as an update occurs. This allows
 * the DOMElement renderable to dynamically react to state changes on the Node.
 *
 * This flushes the internal draw command queue by sending individual commands
 * to the node using `sendDrawCommand`.
 *
 * @method
 *
 * @return {undefined} undefined
 */
DOMElement.prototype.onUpdate = function onUpdate() {
    var node = this._node;
    var queue = this._changeQueue;
    var len = queue.length;

    if (len && node) {
        node.sendDrawCommand('WITH');
        node.sendDrawCommand(node.getLocation());

        while (len--) node.sendDrawCommand(queue.shift());
        if (this._requestRenderSize) {
            node.sendDrawCommand('DOM_RENDER_SIZE');
            node.sendDrawCommand(node.getLocation());
            this._requestRenderSize = false;
        }

    }

    this._requestingUpdate = false;
};

/**
 * Private method which sets the parent of the element in the DOM
 * hierarchy.
 *
 * @method _setParent
 * @private
 *
 * @param {String} path of the parent
 *
 * @return {undefined} undefined
 */
DOMElement.prototype._setParent = function _setParent(path) {
    if (this._node) {
        var location = this._node.getLocation();
        if (location === path || location.indexOf(path) === -1)
            throw new Error('The given path isn\'t an ancestor');
        this._parent = path;
    } else throw new Error('_setParent called on an Element that isn\'t in the scene graph');
};

/**
 * Private method which adds a child of the element in the DOM
 * hierarchy.
 *
 * @method
 * @private
 *
 * @param {String} path of the child
 *
 * @return {undefined} undefined
 */
DOMElement.prototype._addChild = function _addChild(path) {
    if (this._node) {
        var location = this._node.getLocation();
        if (path === location || path.indexOf(location) === -1)
            throw new Error('The given path isn\'t a descendent');
        if (this._children.indexOf(path) === -1) this._children.push(path);
        else throw new Error('The given path is already a child of this element');
    } else throw new Error('_addChild called on an Element that isn\'t in the scene graph');
};

/**
 * Private method which returns the path of the parent of this element
 *
 * @method
 * @private
 *
 * @return {String} path of the parent element
 */
DOMElement.prototype._getParent = function _getParent() {
    return this._parent;
};

/**
 * Private method which returns an array of paths of the children elements
 * of this element
 *
 * @method
 * @private
 *
 * @return {Array} an array of the paths of the child element
 */
DOMElement.prototype._getChildren = function _getChildren() {
    return this._children;
};

/**
 * Method to be invoked by the Node as soon as the node (or any of its
 * ancestors) is being mounted.
 *
 * @method onMount
 *
 * @param {Node} node      Parent node to which the component should be added.
 * @param {String} id      Path at which the component (or node) is being
 *                          attached. The path is being set on the actual
 *                          DOMElement as a `data-fa-path`-attribute.
 *
 * @return {undefined} undefined
 */
DOMElement.prototype.onMount = function onMount(node, id) {
    this._node = node;
    this._id = id;
    this._UIEvents = node.getUIEvents().slice(0);
    this.draw();
    this.setAttribute('data-fa-path', node.getLocation());
};

/**
 * Method to be invoked by the Node as soon as the node is being dismounted
 * either directly or by dismounting one of its ancestors.
 *
 * @method
 *
 * @return {undefined} undefined
 */
DOMElement.prototype.onDismount = function onDismount() {
    this.setProperty('display', 'none');
    this.setAttribute('data-fa-path', '');
    this._initialized = false;
};

/**
 * Method to be invoked by the node as soon as the DOMElement is being shown.
 * This results into the DOMElement setting the `display` property to `block`
 * and therefore visually showing the corresponding DOMElement (again).
 *
 * @method
 *
 * @return {undefined} undefined
 */
DOMElement.prototype.onShow = function onShow() {
    this.setProperty('display', 'block');
};

/**
 * Method to be invoked by the node as soon as the DOMElement is being hidden.
 * This results into the DOMElement setting the `display` property to `none`
 * and therefore visually hiding the corresponding DOMElement (again).
 *
 * @method
 *
 * @return {undefined} undefined
 */
DOMElement.prototype.onHide = function onHide() {
    this.setProperty('display', 'none');
};

/**
 * Enables or disables WebGL 'cutout' for this element, which affects
 * how the element is layered with WebGL objects in the scene.  This is designed
 * mainly as a way to acheive
 *
 * @method
 *
 * @param {Boolean} usesCutout  The presence of a WebGL 'cutout' for this element.
 *
 * @return {undefined} undefined
 */
DOMElement.prototype.setCutoutState = function setCutoutState(usesCutout) {
    this._changeQueue.push('GL_CUTOUT_STATE', usesCutout);

    if (this._initialized) this._requestUpdate();
};

/**
 * Method to be invoked by the node as soon as the transform matrix associated
 * with the node changes. The DOMElement will react to transform changes by sending
 * `CHANGE_TRANSFORM` commands to the `DOMRenderer`.
 *
 * @method
 *
 * @param {Float32Array} transform The final transform matrix
 *
 * @return {undefined} undefined
 */
DOMElement.prototype.onTransformChange = function onTransformChange (transform) {
    this._changeQueue.push('CHANGE_TRANSFORM');
    for (var i = 0, len = transform.length ; i < len ; i++)
        this._changeQueue.push(transform[i]);

    this.onUpdate();
};

/**
 * Method to be invoked by the node as soon as its computed size changes.
 *
 * @method
 *
 * @param {Float32Array} size Size of the Node in pixels
 *
 * @return {DOMElement} this
 */
DOMElement.prototype.onSizeChange = function onSizeChange(size) {
    var sizeMode = this._node.getSizeMode();
    var sizedX = sizeMode[0] !== RENDER_SIZE;
    var sizedY = sizeMode[1] !== RENDER_SIZE;
    if (this._initialized)
        this._changeQueue.push('CHANGE_SIZE',
            sizedX ? size[0] : sizedX,
            sizedY ? size[1] : sizedY);

    if (!this._requestingUpdate) this._requestUpdate();
    return this;
};

/**
 * Method to be invoked by the node as soon as its opacity changes
 *
 * @method
 *
 * @param {Number} opacity The new opacity, as a scalar from 0 to 1
 *
 * @return {DOMElement} this
 */
DOMElement.prototype.onOpacityChange = function onOpacityChange(opacity) {
    return this.setProperty('opacity', opacity);
};

/**
 * Method to be invoked by the node as soon as a new UIEvent is being added.
 * This results into an `ADD_EVENT_LISTENER` command being send.
 *
 * @param {String} UIEvent UIEvent to be subscribed to (e.g. `click`)
 *
 * @return {undefined} undefined
 */
DOMElement.prototype.onAddUIEvent = function onAddUIEvent(UIEvent) {
    if (this._UIEvents.indexOf(UIEvent) === -1) {
        this._subscribe(UIEvent);
        this._UIEvents.push(UIEvent);
    }
    else if (this._inDraw) {
        this._subscribe(UIEvent);
    }
    return this;
};

/**
 * Appends an `ADD_EVENT_LISTENER` command to the command queue.
 *
 * @method
 * @private
 *
 * @param {String} UIEvent Event type (e.g. `click`)
 *
 * @return {undefined} undefined
 */
DOMElement.prototype._subscribe = function _subscribe (UIEvent) {
    if (this._initialized) {
        this._changeQueue.push('SUBSCRIBE', UIEvent, true);
    }
    if (!this._requestingUpdate) {
        this._requestUpdate();
    }
    if (!this._requestingUpdate) this._requestUpdate();
};

/**
 * Method to be invoked by the node as soon as the underlying size mode
 * changes. This results into the size being fetched from the node in
 * order to update the actual, rendered size.
 *
 * @method
 *
 * @param {Number} x the sizing mode in use for determining size in the x direction
 * @param {Number} y the sizing mode in use for determining size in the y direction
 * @param {Number} z the sizing mode in use for determining size in the z direction
 *
 * @return {undefined} undefined
 */
DOMElement.prototype.onSizeModeChange = function onSizeModeChange(x, y, z) {
    if (x === RENDER_SIZE || y === RENDER_SIZE || z === RENDER_SIZE) {
        this._renderSized = true;
        this._requestRenderSize = true;
    }
    this.onSizeChange(this._node.getSize());
};

/**
 * Method to be retrieve the rendered size of the DOM element that is
 * drawn for this node.
 *
 * @method
 *
 * @return {Array} size of the rendered DOM element in pixels
 */
DOMElement.prototype.getRenderSize = function getRenderSize() {
    return this._renderSize;
};

/**
 * Method to have the component request an update from its Node
 *
 * @method
 * @private
 *
 * @return {undefined} undefined
 */
DOMElement.prototype._requestUpdate = function _requestUpdate() {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }
};

/**
 * Initializes the DOMElement by sending the `INIT_DOM` command. This creates
 * or reallocates a new Element in the actual DOM hierarchy.
 *
 * @method
 *
 * @return {undefined} undefined
 */
DOMElement.prototype.init = function init() {
    this._changeQueue.push('INIT_DOM', this._tagName);
    this._initialized = true;
    this.onTransformChange(this._node.getTransform());
    this.onSizeChange(this._node.getSize());
    if (!this._requestingUpdate) this._requestUpdate();
};

/**
 * Sets the id attribute of the DOMElement.
 *
 * @method
 *
 * @param {String} id New id to be set
 *
 * @return {DOMElement} this
 */
DOMElement.prototype.setId = function setId (id) {
    this.setAttribute('id', id);
    return this;
};

/**
 * Adds a new class to the internal class list of the underlying Element in the
 * DOM.
 *
 * @method
 *
 * @param {String} value New class name to be added
 *
 * @return {DOMElement} this
 */
DOMElement.prototype.addClass = function addClass (value) {
    if (this._classes.indexOf(value) < 0) {
        if (this._initialized) this._changeQueue.push('ADD_CLASS', value);
        this._classes.push(value);
        if (!this._requestingUpdate) this._requestUpdate();
        if (this._renderSized) this._requestRenderSize = true;
        return this;
    }

    if (this._inDraw) {
        if (this._initialized) this._changeQueue.push('ADD_CLASS', value);
        if (!this._requestingUpdate) this._requestUpdate();
    }
    return this;
};

/**
 * Removes a class from the DOMElement's classList.
 *
 * @method
 *
 * @param {String} value Class name to be removed
 *
 * @return {DOMElement} this
 */
DOMElement.prototype.removeClass = function removeClass (value) {
    var index = this._classes.indexOf(value);

    if (index < 0) return this;

    this._changeQueue.push('REMOVE_CLASS', value);

    this._classes.splice(index, 1);

    if (!this._requestingUpdate) this._requestUpdate();
    return this;
};


/**
 * Checks if the DOMElement has the passed in class.
 *
 * @method
 *
 * @param {String} value The class name
 *
 * @return {Boolean} Boolean value indicating whether the passed in class name is in the DOMElement's class list.
 */
DOMElement.prototype.hasClass = function hasClass (value) {
    return this._classes.indexOf(value) !== -1;
};

/**
 * Sets an attribute of the DOMElement.
 *
 * @method
 *
 * @param {String} name Attribute key (e.g. `src`)
 * @param {String} value Attribute value (e.g. `http://famo.us`)
 *
 * @return {DOMElement} this
 */
DOMElement.prototype.setAttribute = function setAttribute (name, value) {
    if (this._attributes[name] !== value || this._inDraw) {
        this._attributes[name] = value;
        if (this._initialized) this._changeQueue.push('CHANGE_ATTRIBUTE', name, value);
        if (!this._requestUpdate) this._requestUpdate();
    }

    return this;
};

/**
 * Sets a CSS property
 *
 * @chainable
 *
 * @param {String} name  Name of the CSS rule (e.g. `background-color`)
 * @param {String} value Value of CSS property (e.g. `red`)
 *
 * @return {DOMElement} this
 */
DOMElement.prototype.setProperty = function setProperty (name, value) {
    if (this._styles[name] !== value || this._inDraw) {
        this._styles[name] = value;
        if (this._initialized) this._changeQueue.push('CHANGE_PROPERTY', name, value);
        if (!this._requestingUpdate) this._requestUpdate();
        if (this._renderSized) this._requestRenderSize = true;
    }

    return this;
};

/**
 * Sets the content of the DOMElement. This is using `innerHTML`, escaping user
 * generated content is therefore essential for security purposes.
 *
 * @method
 *
 * @param {String} content Content to be set using `.innerHTML = ...`
 *
 * @return {DOMElement} this
 */
DOMElement.prototype.setContent = function setContent (content) {
    if (this._content !== content || this._inDraw) {
        this._content = content;
        if (this._initialized) this._changeQueue.push('CHANGE_CONTENT', content);
        if (!this._requestingUpdate) this._requestUpdate();
        if (this._renderSized) this._requestRenderSize = true;
    }

    return this;
};

/**
 * Subscribes to a DOMElement using.
 *
 * @method on
 *
 * @param {String} event       The event type (e.g. `click`).
 * @param {Function} listener  Handler function for the specified event type
 *                              in which the payload event object will be
 *                              passed into.
 *
 * @return {Function} A function to call if you want to remove the callback
 */
DOMElement.prototype.on = function on (event, listener) {
    return this._callbacks.on(event, listener);
};

/**
 * Function to be invoked by the Node whenever an event is being received.
 * There are two different ways to subscribe for those events:
 *
 * 1. By overriding the onReceive method (and possibly using `switch` in order
 *     to differentiate between the different event types).
 * 2. By using DOMElement and using the built-in CallbackStore.
 *
 * @method
 *
 * @param {String} event Event type (e.g. `click`)
 * @param {Object} payload Event object.
 *
 * @return {undefined} undefined
 */
DOMElement.prototype.onReceive = function onReceive (event, payload) {
    if (event === 'resize') {
        this._renderSize[0] = payload.val[0];
        this._renderSize[1] = payload.val[1];
        if (!this._requestingUpdate) this._requestUpdate();
    }
    this._callbacks.trigger(event, payload);
};

/**
 * The draw function is being used in order to allow mutating the DOMElement
 * before actually mounting the corresponding node.
 *
 * @method
 * @private
 *
 * @return {undefined} undefined
 */
DOMElement.prototype.draw = function draw() {
    var key;
    var i;
    var len;

    this._inDraw = true;

    this.init();

    for (i = 0, len = this._classes.length ; i < len ; i++)
        this.addClass(this._classes[i]);

    if (this._content) this.setContent(this._content);

    for (key in this._styles)
        if (this._styles[key])
            this.setProperty(key, this._styles[key]);

    for (key in this._attributes)
        if (this._attributes[key])
            this.setAttribute(key, this._attributes[key]);

    for (i = 0, len = this._UIEvents.length ; i < len ; i++)
        this.onAddUIEvent(this._UIEvents[i]);

    this._inDraw = false;
};

module.exports = DOMElement;

},{"../utilities/CallbackStore":36}],12:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var ElementCache = require('./ElementCache');
var math = require('./Math');
var vendorPrefix = require('../utilities/vendorPrefix');
var eventMap = require('./events/EventMap');

var TRANSFORM = null;

/**
 * DOMRenderer is a class responsible for adding elements
 * to the DOM and writing to those elements.
 * There is a DOMRenderer per context, represented as an
 * element and a selector. It is instantiated in the
 * context class.
 *
 * @class DOMRenderer
 *
 * @param {HTMLElement} element an element.
 * @param {String} selector the selector of the element.
 * @param {Compositor} compositor the compositor controlling the renderer
 */
function DOMRenderer (element, selector, compositor) {
    element.classList.add('famous-dom-renderer');

    TRANSFORM = TRANSFORM || vendorPrefix('transform');
    this._compositor = compositor; // a reference to the compositor

    this._target = null; // a register for holding the current
                         // element that the Renderer is operating
                         // upon

    this._parent = null; // a register for holding the parent
                         // of the target

    this._path = null; // a register for holding the path of the target
                       // this register must be set first, and then
                       // children, target, and parent are all looked
                       // up from that.

    this._children = []; // a register for holding the children of the
                         // current target.

    this._root = new ElementCache(element, selector); // the root
                                                      // of the dom tree that this
                                                      // renderer is responsible
                                                      // for

    this._boundTriggerEvent = this._triggerEvent.bind(this);

    this._selector = selector;

    this._elements = {};

    this._elements[selector] = this._root;

    this.perspectiveTransform = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    this._VPtransform = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

    this._size = [null, null];
}


/**
 * Attaches an EventListener to the element associated with the passed in path.
 * Prevents the default browser action on all subsequent events if
 * `preventDefault` is truthy.
 * All incoming events will be forwarded to the compositor by invoking the
 * `sendEvent` method.
 * Delegates events if possible by attaching the event listener to the context.
 *
 * @method
 *
 * @param {String} type DOM event type (e.g. click, mouseover).
 * @param {Boolean} preventDefault Whether or not the default browser action should be prevented.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.subscribe = function subscribe(type, preventDefault) {
    // TODO preventDefault should be a separate command
    this._assertTargetLoaded();

    this._target.preventDefault[type] = preventDefault;
    this._target.subscribe[type] = true;

    if (
        !this._target.listeners[type] && !this._root.listeners[type]
    ) {
        var target = eventMap[type][1] ? this._root : this._target;
        target.listeners[type] = this._boundTriggerEvent;
        target.element.addEventListener(type, this._boundTriggerEvent);
    }
};

/**
 * Function to be added using `addEventListener` to the corresponding
 * DOMElement.
 *
 * @method
 * @private
 *
 * @param {Event} ev DOM Event payload
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype._triggerEvent = function _triggerEvent(ev) {
    // Use ev.path, which is an array of Elements (polyfilled if needed).
    var evPath = ev.path ? ev.path : _getPath(ev);
    // First element in the path is the element on which the event has actually
    // been emitted.
    for (var i = 0; i < evPath.length; i++) {
        // Skip nodes that don't have a dataset property or data-fa-path
        // attribute.
        if (!evPath[i].dataset) continue;
        var path = evPath[i].dataset.faPath;
        if (!path) continue;

        // Stop further event propogation and path traversal as soon as the
        // first ElementCache subscribing for the emitted event has been found.
        if (this._elements[path].subscribe[ev.type]) {
            ev.stopPropagation();

            // Optionally preventDefault. This needs forther consideration and
            // should be optional. Eventually this should be a separate command/
            // method.
            if (this._elements[path].preventDefault[ev.type]) {
                ev.preventDefault();
            }

            var NormalizedEventConstructor = eventMap[ev.type][0];

            // Finally send the event to the Worker Thread through the
            // compositor.
            this._compositor.sendEvent(path, ev.type, new NormalizedEventConstructor(ev));

            break;
        }
    }
};


/**
 * getSizeOf gets the dom size of a particular DOM element.  This is
 * needed for render sizing in the scene graph.
 *
 * @method
 *
 * @param {String} path path of the Node in the scene graph
 *
 * @return {Array} a vec3 of the offset size of the dom element
 */
DOMRenderer.prototype.getSizeOf = function getSizeOf(path) {
    var element = this._elements[path];
    if (!element) return null;

    var res = {val: element.size};
    this._compositor.sendEvent(path, 'resize', res);
    return res;
};

function _getPath(ev) {
    // TODO move into _triggerEvent, avoid object allocation
    var path = [];
    var node = ev.target;
    while (node !== document.body) {
        path.push(node);
        node = node.parentNode;
    }
    return path;
}


/**
 * Determines the size of the context by querying the DOM for `offsetWidth` and
 * `offsetHeight`.
 *
 * @method
 *
 * @return {Array} Offset size.
 */
DOMRenderer.prototype.getSize = function getSize() {
    this._size[0] = this._root.element.offsetWidth;
    this._size[1] = this._root.element.offsetHeight;
    return this._size;
};

DOMRenderer.prototype._getSize = DOMRenderer.prototype.getSize;


/**
 * Executes the retrieved draw commands. Draw commands only refer to the
 * cross-browser normalized `transform` property.
 *
 * @method
 *
 * @param {Object} renderState description
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.draw = function draw(renderState) {
    if (renderState.perspectiveDirty) {
        this.perspectiveDirty = true;

        this.perspectiveTransform[0] = renderState.perspectiveTransform[0];
        this.perspectiveTransform[1] = renderState.perspectiveTransform[1];
        this.perspectiveTransform[2] = renderState.perspectiveTransform[2];
        this.perspectiveTransform[3] = renderState.perspectiveTransform[3];

        this.perspectiveTransform[4] = renderState.perspectiveTransform[4];
        this.perspectiveTransform[5] = renderState.perspectiveTransform[5];
        this.perspectiveTransform[6] = renderState.perspectiveTransform[6];
        this.perspectiveTransform[7] = renderState.perspectiveTransform[7];

        this.perspectiveTransform[8] = renderState.perspectiveTransform[8];
        this.perspectiveTransform[9] = renderState.perspectiveTransform[9];
        this.perspectiveTransform[10] = renderState.perspectiveTransform[10];
        this.perspectiveTransform[11] = renderState.perspectiveTransform[11];

        this.perspectiveTransform[12] = renderState.perspectiveTransform[12];
        this.perspectiveTransform[13] = renderState.perspectiveTransform[13];
        this.perspectiveTransform[14] = renderState.perspectiveTransform[14];
        this.perspectiveTransform[15] = renderState.perspectiveTransform[15];
    }

    if (renderState.viewDirty || renderState.perspectiveDirty) {
        math.multiply(this._VPtransform, this.perspectiveTransform, renderState.viewTransform);
        this._root.element.style[TRANSFORM] = this._stringifyMatrix(this._VPtransform);
    }
};


/**
 * Internal helper function used for ensuring that a path is currently loaded.
 *
 * @method
 * @private
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype._assertPathLoaded = function _asserPathLoaded() {
    if (!this._path) throw new Error('path not loaded');
};

/**
 * Internal helper function used for ensuring that a parent is currently loaded.
 *
 * @method
 * @private
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype._assertParentLoaded = function _assertParentLoaded() {
    if (!this._parent) throw new Error('parent not loaded');
};

/**
 * Internal helper function used for ensuring that children are currently
 * loaded.
 *
 * @method
 * @private
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype._assertChildrenLoaded = function _assertChildrenLoaded() {
    if (!this._children) throw new Error('children not loaded');
};

/**
 * Internal helper function used for ensuring that a target is currently loaded.
 *
 * @method  _assertTargetLoaded
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype._assertTargetLoaded = function _assertTargetLoaded() {
    if (!this._target) throw new Error('No target loaded');
};

/**
 * Finds and sets the parent of the currently loaded element (path).
 *
 * @method
 * @private
 *
 * @return {ElementCache} Parent element.
 */
DOMRenderer.prototype.findParent = function findParent () {
    this._assertPathLoaded();

    var path = this._path;
    var parent;

    while (!parent && path.length) {
        path = path.substring(0, path.lastIndexOf('/'));
        parent = this._elements[path];
    }
    this._parent = parent;
    return parent;
};


/**
 * Finds all children of the currently loaded element.
 *
 * @method
 * @private
 *
 * @param {Array} array Output-Array used for writing to (subsequently appending children)
 *
 * @return {Array} array of children elements
 */
DOMRenderer.prototype.findChildren = function findChildren(array) {
    // TODO: Optimize me.
    this._assertPathLoaded();

    var path = this._path + '/';
    var keys = Object.keys(this._elements);
    var i = 0;
    var len;
    array = array ? array : this._children;

    this._children.length = 0;

    while (i < keys.length) {
        if (keys[i].indexOf(path) === -1 || keys[i] === path) keys.splice(i, 1);
        else i++;
    }
    var currentPath;
    var j = 0;
    for (i = 0 ; i < keys.length ; i++) {
        currentPath = keys[i];
        for (j = 0 ; j < keys.length ; j++) {
            if (i !== j && keys[j].indexOf(currentPath) !== -1) {
                keys.splice(j, 1);
                i--;
            }
        }
    }
    for (i = 0, len = keys.length ; i < len ; i++)
        array[i] = this._elements[keys[i]];

    return array;
};


/**
 * Used for determining the target loaded under the current path.
 *
 * @method
 *
 * @return {ElementCache|undefined} Element loaded under defined path.
 */
DOMRenderer.prototype.findTarget = function findTarget() {
    this._target = this._elements[this._path];
    return this._target;
};


/**
 * Loads the passed in path.
 *
 * @method
 *
 * @param {String} path Path to be loaded
 *
 * @return {String} Loaded path
 */
DOMRenderer.prototype.loadPath = function loadPath (path) {
    this._path = path;
    return this._path;
};


/**
 * Inserts a DOMElement at the currently loaded path, assuming no target is
 * loaded. Only one DOMElement can be associated with each path.
 *
 * @method
 *
 * @param {String} tagName Tag name (capitalization will be normalized).
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.insertEl = function insertEl (tagName) {
    if (!this._target ||
         this._target.element.tagName.toLowerCase() === tagName.toLowerCase()) {

        this.findParent();
        this.findChildren();

        this._assertParentLoaded();
        this._assertChildrenLoaded();

        if (this._target) this._parent.element.removeChild(this._target.element);

        this._target = new ElementCache(document.createElement(tagName), this._path);
        this._parent.element.appendChild(this._target.element);
        this._elements[this._path] = this._target;

        for (var i = 0, len = this._children.length ; i < len ; i++) {
            this._target.element.appendChild(this._children[i].element);
        }
    }
};


/**
 * Sets a property on the currently loaded target.
 *
 * @method
 *
 * @param {String} name Property name (e.g. background, color, font)
 * @param {String} value Proprty value (e.g. black, 20px)
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setProperty = function setProperty (name, value) {
    this._assertTargetLoaded();
    this._target.element.style[name] = value;
};


/**
 * Sets the size of the currently loaded target.
 * Removes any explicit sizing constraints when passed in `false`
 * ("true-sizing").
 *
 * @method
 *
 * @param {Number|false} width   Width to be set.
 * @param {Number|false} height  Height to be set.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setSize = function setSize (width, height) {
    this._assertTargetLoaded();

    this.setWidth(width);
    this.setHeight(height);
};

/**
 * Sets the width of the currently loaded target.
 * Removes any explicit sizing constraints when passed in `false`
 * ("true-sizing").
 *
 * @method
 *
 * @param {Number|false} width Width to be set.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setWidth = function setWidth(width) {
    this._assertTargetLoaded();

    var contentWrapper = this._target.content;

    if (width === false) {
        this._target.explicitWidth = true;
        if (contentWrapper) contentWrapper.style.width = '';
        width = contentWrapper ? contentWrapper.offsetWidth : 0;
        this._target.element.style.width = width + 'px';
    }
    else {
        this._target.explicitWidth = false;
        if (contentWrapper) contentWrapper.style.width = width + 'px';
        this._target.element.style.width = width + 'px';
    }

    this._target.size[0] = width;
};

/**
 * Sets the height of the currently loaded target.
 * Removes any explicit sizing constraints when passed in `false`
 * ("true-sizing").
 *
 * @method
 *
 * @param {Number|false} height Height to be set.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setHeight = function setHeight(height) {
    this._assertTargetLoaded();

    var contentWrapper = this._target.content;

    if (height === false) {
        this._target.explicitHeight = true;
        if (contentWrapper) contentWrapper.style.height = '';
        height = contentWrapper ? contentWrapper.offsetHeight : 0;
        this._target.element.style.height = height + 'px';
    }
    else {
        this._target.explicitHeight = false;
        if (contentWrapper) contentWrapper.style.height = height + 'px';
        this._target.element.style.height = height + 'px';
    }

    this._target.size[1] = height;
};

/**
 * Sets an attribute on the currently loaded target.
 *
 * @method
 *
 * @param {String} name Attribute name (e.g. href)
 * @param {String} value Attribute value (e.g. http://famous.org)
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setAttribute = function setAttribute(name, value) {
    this._assertTargetLoaded();
    this._target.element.setAttribute(name, value);
};

/**
 * Sets the `innerHTML` content of the currently loaded target.
 *
 * @method
 *
 * @param {String} content Content to be set as `innerHTML`
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setContent = function setContent(content) {
    this._assertTargetLoaded();
    this.findChildren();

    if (!this._target.content) {
        this._target.content = document.createElement('div');
        this._target.content.classList.add('famous-dom-element-content');
        this._target.element.insertBefore(
            this._target.content,
            this._target.element.firstChild
        );
    }
    this._target.content.innerHTML = content;

    this.setSize(
        this._target.explicitWidth ? false : this._target.size[0],
        this._target.explicitHeight ? false : this._target.size[1]
    );
};


/**
 * Sets the passed in transform matrix (world space). Inverts the parent's world
 * transform.
 *
 * @method
 *
 * @param {Float32Array} transform The transform for the loaded DOM Element in world space
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setMatrix = function setMatrix(transform) {
    // TODO Don't multiply matrics in the first place.
    this._assertTargetLoaded();
    this.findParent();
    var worldTransform = this._target.worldTransform;
    var changed = false;

    var i;
    var len;

    if (transform)
        for (i = 0, len = 16 ; i < len ; i++) {
            changed = changed ? changed : worldTransform[i] === transform[i];
            worldTransform[i] = transform[i];
        }
    else changed = true;

    if (changed) {
        math.invert(this._target.invertedParent, this._parent.worldTransform);
        math.multiply(this._target.finalTransform, this._target.invertedParent, worldTransform);

        // TODO: this is a temporary fix for draw commands
        // coming in out of order
        var children = this.findChildren([]);
        var previousPath = this._path;
        var previousTarget = this._target;
        for (i = 0, len = children.length ; i < len ; i++) {
            this._target = children[i];
            this._path = this._target.path;
            this.setMatrix();
        }
        this._path = previousPath;
        this._target = previousTarget;
    }

    this._target.element.style[TRANSFORM] = this._stringifyMatrix(this._target.finalTransform);
};


/**
 * Adds a class to the classList associated with the currently loaded target.
 *
 * @method
 *
 * @param {String} domClass Class name to be added to the current target.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.addClass = function addClass(domClass) {
    this._assertTargetLoaded();
    this._target.element.classList.add(domClass);
};


/**
 * Removes a class from the classList associated with the currently loaded
 * target.
 *
 * @method
 *
 * @param {String} domClass Class name to be removed from currently loaded target.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.removeClass = function removeClass(domClass) {
    this._assertTargetLoaded();
    this._target.element.classList.remove(domClass);
};


/**
 * Stringifies the passed in matrix for setting the `transform` property.
 *
 * @method  _stringifyMatrix
 * @private
 *
 * @param {Array} m    Matrix as an array or array-like object.
 * @return {String}     Stringified matrix as `matrix3d`-property.
 */
DOMRenderer.prototype._stringifyMatrix = function _stringifyMatrix(m) {
    var r = 'matrix3d(';

    r += (m[0] < 0.000001 && m[0] > -0.000001) ? '0,' : m[0] + ',';
    r += (m[1] < 0.000001 && m[1] > -0.000001) ? '0,' : m[1] + ',';
    r += (m[2] < 0.000001 && m[2] > -0.000001) ? '0,' : m[2] + ',';
    r += (m[3] < 0.000001 && m[3] > -0.000001) ? '0,' : m[3] + ',';
    r += (m[4] < 0.000001 && m[4] > -0.000001) ? '0,' : m[4] + ',';
    r += (m[5] < 0.000001 && m[5] > -0.000001) ? '0,' : m[5] + ',';
    r += (m[6] < 0.000001 && m[6] > -0.000001) ? '0,' : m[6] + ',';
    r += (m[7] < 0.000001 && m[7] > -0.000001) ? '0,' : m[7] + ',';
    r += (m[8] < 0.000001 && m[8] > -0.000001) ? '0,' : m[8] + ',';
    r += (m[9] < 0.000001 && m[9] > -0.000001) ? '0,' : m[9] + ',';
    r += (m[10] < 0.000001 && m[10] > -0.000001) ? '0,' : m[10] + ',';
    r += (m[11] < 0.000001 && m[11] > -0.000001) ? '0,' : m[11] + ',';
    r += (m[12] < 0.000001 && m[12] > -0.000001) ? '0,' : m[12] + ',';
    r += (m[13] < 0.000001 && m[13] > -0.000001) ? '0,' : m[13] + ',';
    r += (m[14] < 0.000001 && m[14] > -0.000001) ? '0,' : m[14] + ',';

    r += m[15] + ')';
    return r;
};

module.exports = DOMRenderer;

},{"../utilities/vendorPrefix":39,"./ElementCache":13,"./Math":14,"./events/EventMap":17}],13:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

// Transform identity matrix. 
var ident = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

/**
 * ElementCache is being used for keeping track of an element's DOM Element,
 * path, world transform, inverted parent, final transform (as being used for
 * setting the actual `transform`-property) and post render size (final size as
 * being rendered to the DOM).
 * 
 * @class ElementCache
 *  
 * @param {Element} element DOMElement
 * @param {String} path Path used for uniquely identifying the location in the scene graph.
 */ 
function ElementCache (element, path) {
    this.element = element;
    this.path = path;
    this.content = null;
    this.size = new Int16Array(3);
    this.explicitHeight = false;
    this.explicitWidth = false;
    this.worldTransform = new Float32Array(ident);
    this.invertedParent = new Float32Array(ident);
    this.finalTransform = new Float32Array(ident);
    this.postRenderSize = new Float32Array(2);
    this.listeners = {};
    this.preventDefault = {};
    this.subscribe = {};
}

module.exports = ElementCache;

},{}],14:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * A method for inverting a transform matrix
 *
 * @method
 *
 * @param {Array} out array to store the return of the inversion
 * @param {Array} a transform matrix to inverse
 *
 * @return {Array} out
 *   output array that is storing the transform matrix
 */
function invert (out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
}

/**
 * A method for multiplying two matricies
 *
 * @method
 *
 * @param {Array} out array to store the return of the multiplication
 * @param {Array} a transform matrix to multiply
 * @param {Array} b transform matrix to multiply
 *
 * @return {Array} out
 *   output array that is storing the transform matrix
 */
function multiply (out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3],
        b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7],
        b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11],
        b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];

    var changed = false;
    var out0, out1, out2, out3;

    out0 = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out1 = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out2 = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out3 = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    changed = changed ?
              changed : out0 === out[0] ||
                        out1 === out[1] ||
                        out2 === out[2] ||
                        out3 === out[3];

    out[0] = out0;
    out[1] = out1;
    out[2] = out2;
    out[3] = out3;

    b0 = b4; b1 = b5; b2 = b6; b3 = b7;
    out0 = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out1 = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out2 = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out3 = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    changed = changed ?
              changed : out0 === out[4] ||
                        out1 === out[5] ||
                        out2 === out[6] ||
                        out3 === out[7];

    out[4] = out0;
    out[5] = out1;
    out[6] = out2;
    out[7] = out3;

    b0 = b8; b1 = b9; b2 = b10; b3 = b11;
    out0 = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out1 = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out2 = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out3 = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    changed = changed ?
              changed : out0 === out[8] ||
                        out1 === out[9] ||
                        out2 === out[10] ||
                        out3 === out[11];

    out[8] = out0;
    out[9] = out1;
    out[10] = out2;
    out[11] = out3;

    b0 = b12; b1 = b13; b2 = b14; b3 = b15;
    out0 = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out1 = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out2 = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out3 = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    changed = changed ?
              changed : out0 === out[12] ||
                        out1 === out[13] ||
                        out2 === out[14] ||
                        out3 === out[15];

    out[12] = out0;
    out[13] = out1;
    out[14] = out2;
    out[15] = out3;

    return out;
}

module.exports = {
    multiply: multiply,
    invert: invert
};

},{}],15:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#events-compositionevents).
 *
 * @class CompositionEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function CompositionEvent(ev) {
    // [Constructor(DOMString typeArg, optional CompositionEventInit compositionEventInitDict)]
    // interface CompositionEvent : UIEvent {
    //     readonly    attribute DOMString data;
    // };

    UIEvent.call(this, ev);

    /**
     * @name CompositionEvent#data
     * @type String
     */
    this.data = ev.data;
}

CompositionEvent.prototype = Object.create(UIEvent.prototype);
CompositionEvent.prototype.constructor = CompositionEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
CompositionEvent.prototype.toString = function toString () {
    return 'CompositionEvent';
};

module.exports = CompositionEvent;

},{"./UIEvent":23}],16:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * The Event class is being used in order to normalize native DOM events.
 * Events need to be normalized in order to be serialized through the structured
 * cloning algorithm used by the `postMessage` method (Web Workers).
 *
 * Wrapping DOM events also has the advantage of providing a consistent
 * interface for interacting with DOM events across browsers by copying over a
 * subset of the exposed properties that is guaranteed to be consistent across
 * browsers.
 *
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#interface-Event).
 *
 * @class Event
 *
 * @param {Event} ev The native DOM event.
 */
function Event(ev) {
    // [Constructor(DOMString type, optional EventInit eventInitDict),
    //  Exposed=Window,Worker]
    // interface Event {
    //   readonly attribute DOMString type;
    //   readonly attribute EventTarget? target;
    //   readonly attribute EventTarget? currentTarget;

    //   const unsigned short NONE = 0;
    //   const unsigned short CAPTURING_PHASE = 1;
    //   const unsigned short AT_TARGET = 2;
    //   const unsigned short BUBBLING_PHASE = 3;
    //   readonly attribute unsigned short eventPhase;

    //   void stopPropagation();
    //   void stopImmediatePropagation();

    //   readonly attribute boolean bubbles;
    //   readonly attribute boolean cancelable;
    //   void preventDefault();
    //   readonly attribute boolean defaultPrevented;

    //   [Unforgeable] readonly attribute boolean isTrusted;
    //   readonly attribute DOMTimeStamp timeStamp;

    //   void initEvent(DOMString type, boolean bubbles, boolean cancelable);
    // };

    /**
     * @name Event#type
     * @type String
     */
    this.type = ev.type;

    /**
     * @name Event#defaultPrevented
     * @type Boolean
     */
    this.defaultPrevented = ev.defaultPrevented;

    /**
     * @name Event#timeStamp
     * @type Number
     */
    this.timeStamp = ev.timeStamp;


    /**
     * Used for exposing the current target's value.
     *
     * @name Event#value
     * @type String
     */
    var targetConstructor = ev.target.constructor;
    // TODO Support HTMLKeygenElement
    if (
        targetConstructor === HTMLInputElement ||
        targetConstructor === HTMLTextAreaElement ||
        targetConstructor === HTMLSelectElement
    ) {
        this.value = ev.target.value;
    }
}

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
Event.prototype.toString = function toString () {
    return 'Event';
};

module.exports = Event;

},{}],17:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var CompositionEvent = require('./CompositionEvent');
var Event = require('./Event');
var FocusEvent = require('./FocusEvent');
var InputEvent = require('./InputEvent');
var KeyboardEvent = require('./KeyboardEvent');
var MouseEvent = require('./MouseEvent');
var TouchEvent = require('./TouchEvent');
var UIEvent = require('./UIEvent');
var WheelEvent = require('./WheelEvent');

/**
 * A mapping of DOM events to the corresponding handlers
 *
 * @name EventMap
 * @type Object
 */
var EventMap = {
    change                         : [Event, true],
    submit                         : [Event, true],

    // UI Events (http://www.w3.org/TR/uievents/)
    abort                          : [Event, false],
    beforeinput                    : [InputEvent, true],
    blur                           : [FocusEvent, false],
    click                          : [MouseEvent, true],
    compositionend                 : [CompositionEvent, true],
    compositionstart               : [CompositionEvent, true],
    compositionupdate              : [CompositionEvent, true],
    dblclick                       : [MouseEvent, true],
    focus                          : [FocusEvent, false],
    focusin                        : [FocusEvent, true],
    focusout                       : [FocusEvent, true],
    input                          : [InputEvent, true],
    keydown                        : [KeyboardEvent, true],
    keyup                          : [KeyboardEvent, true],
    load                           : [Event, false],
    mousedown                      : [MouseEvent, true],
    mouseenter                     : [MouseEvent, false],
    mouseleave                     : [MouseEvent, false],

    // bubbles, but will be triggered very frequently
    mousemove                      : [MouseEvent, false],

    mouseout                       : [MouseEvent, true],
    mouseover                      : [MouseEvent, true],
    mouseup                        : [MouseEvent, true],
    resize                         : [UIEvent, false],

    // might bubble
    scroll                         : [UIEvent, false],

    select                         : [Event, true],
    unload                         : [Event, false],
    wheel                          : [WheelEvent, true],

    // Touch Events Extension (http://www.w3.org/TR/touch-events-extensions/)
    touchcancel                    : [TouchEvent, true],
    touchend                       : [TouchEvent, true],
    touchmove                      : [TouchEvent, true],
    touchstart                     : [TouchEvent, true]
};

module.exports = EventMap;

},{"./CompositionEvent":15,"./Event":16,"./FocusEvent":18,"./InputEvent":19,"./KeyboardEvent":20,"./MouseEvent":21,"./TouchEvent":22,"./UIEvent":23,"./WheelEvent":24}],18:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#events-focusevent).
 *
 * @class FocusEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function FocusEvent(ev) {
    // [Constructor(DOMString typeArg, optional FocusEventInit focusEventInitDict)]
    // interface FocusEvent : UIEvent {
    //     readonly    attribute EventTarget? relatedTarget;
    // };

    UIEvent.call(this, ev);
}

FocusEvent.prototype = Object.create(UIEvent.prototype);
FocusEvent.prototype.constructor = FocusEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
FocusEvent.prototype.toString = function toString () {
    return 'FocusEvent';
};

module.exports = FocusEvent;

},{"./UIEvent":23}],19:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

/**
 * See [Input Events](http://w3c.github.io/editing-explainer/input-events.html#idl-def-InputEvent).
 *
 * @class InputEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function InputEvent(ev) {
    // [Constructor(DOMString typeArg, optional InputEventInit inputEventInitDict)]
    // interface InputEvent : UIEvent {
    //     readonly    attribute DOMString inputType;
    //     readonly    attribute DOMString data;
    //     readonly    attribute boolean   isComposing;
    //     readonly    attribute Range     targetRange;
    // };

    UIEvent.call(this, ev);

    /**
     * @name    InputEvent#inputType
     * @type    String
     */
    this.inputType = ev.inputType;

    /**
     * @name    InputEvent#data
     * @type    String
     */
    this.data = ev.data;

    /**
     * @name    InputEvent#isComposing
     * @type    Boolean
     */
    this.isComposing = ev.isComposing;

    /**
     * **Limited browser support**.
     *
     * @name    InputEvent#targetRange
     * @type    Boolean
     */
    this.targetRange = ev.targetRange;
}

InputEvent.prototype = Object.create(UIEvent.prototype);
InputEvent.prototype.constructor = InputEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
InputEvent.prototype.toString = function toString () {
    return 'InputEvent';
};

module.exports = InputEvent;

},{"./UIEvent":23}],20:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#events-keyboardevents).
 *
 * @class KeyboardEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function KeyboardEvent(ev) {
    // [Constructor(DOMString typeArg, optional KeyboardEventInit keyboardEventInitDict)]
    // interface KeyboardEvent : UIEvent {
    //     // KeyLocationCode
    //     const unsigned long DOM_KEY_LOCATION_STANDARD = 0x00;
    //     const unsigned long DOM_KEY_LOCATION_LEFT = 0x01;
    //     const unsigned long DOM_KEY_LOCATION_RIGHT = 0x02;
    //     const unsigned long DOM_KEY_LOCATION_NUMPAD = 0x03;
    //     readonly    attribute DOMString     key;
    //     readonly    attribute DOMString     code;
    //     readonly    attribute unsigned long location;
    //     readonly    attribute boolean       ctrlKey;
    //     readonly    attribute boolean       shiftKey;
    //     readonly    attribute boolean       altKey;
    //     readonly    attribute boolean       metaKey;
    //     readonly    attribute boolean       repeat;
    //     readonly    attribute boolean       isComposing;
    //     boolean getModifierState (DOMString keyArg);
    // };

    UIEvent.call(this, ev);

    /**
     * @name KeyboardEvent#DOM_KEY_LOCATION_STANDARD
     * @type Number
     */
    this.DOM_KEY_LOCATION_STANDARD = 0x00;

    /**
     * @name KeyboardEvent#DOM_KEY_LOCATION_LEFT
     * @type Number
     */
    this.DOM_KEY_LOCATION_LEFT = 0x01;

    /**
     * @name KeyboardEvent#DOM_KEY_LOCATION_RIGHT
     * @type Number
     */
    this.DOM_KEY_LOCATION_RIGHT = 0x02;

    /**
     * @name KeyboardEvent#DOM_KEY_LOCATION_NUMPAD
     * @type Number
     */
    this.DOM_KEY_LOCATION_NUMPAD = 0x03;

    /**
     * @name KeyboardEvent#key
     * @type String
     */
    this.key = ev.key;

    /**
     * @name KeyboardEvent#code
     * @type String
     */
    this.code = ev.code;

    /**
     * @name KeyboardEvent#location
     * @type Number
     */
    this.location = ev.location;

    /**
     * @name KeyboardEvent#ctrlKey
     * @type Boolean
     */
    this.ctrlKey = ev.ctrlKey;

    /**
     * @name KeyboardEvent#shiftKey
     * @type Boolean
     */
    this.shiftKey = ev.shiftKey;

    /**
     * @name KeyboardEvent#altKey
     * @type Boolean
     */
    this.altKey = ev.altKey;

    /**
     * @name KeyboardEvent#metaKey
     * @type Boolean
     */
    this.metaKey = ev.metaKey;

    /**
     * @name KeyboardEvent#repeat
     * @type Boolean
     */
    this.repeat = ev.repeat;

    /**
     * @name KeyboardEvent#isComposing
     * @type Boolean
     */
    this.isComposing = ev.isComposing;

    /**
     * @name KeyboardEvent#keyCode
     * @type String
     * @deprecated
     */
    this.keyCode = ev.keyCode;
}

KeyboardEvent.prototype = Object.create(UIEvent.prototype);
KeyboardEvent.prototype.constructor = KeyboardEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
KeyboardEvent.prototype.toString = function toString () {
    return 'KeyboardEvent';
};

module.exports = KeyboardEvent;

},{"./UIEvent":23}],21:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#events-mouseevents).
 *
 * @class KeyboardEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function MouseEvent(ev) {
    // [Constructor(DOMString typeArg, optional MouseEventInit mouseEventInitDict)]
    // interface MouseEvent : UIEvent {
    //     readonly    attribute long           screenX;
    //     readonly    attribute long           screenY;
    //     readonly    attribute long           clientX;
    //     readonly    attribute long           clientY;
    //     readonly    attribute boolean        ctrlKey;
    //     readonly    attribute boolean        shiftKey;
    //     readonly    attribute boolean        altKey;
    //     readonly    attribute boolean        metaKey;
    //     readonly    attribute short          button;
    //     readonly    attribute EventTarget?   relatedTarget;
    //     // Introduced in this specification
    //     readonly    attribute unsigned short buttons;
    //     boolean getModifierState (DOMString keyArg);
    // };

    UIEvent.call(this, ev);

    /**
     * @name MouseEvent#screenX
     * @type Number
     */
    this.screenX = ev.screenX;

    /**
     * @name MouseEvent#screenY
     * @type Number
     */
    this.screenY = ev.screenY;

    /**
     * @name MouseEvent#clientX
     * @type Number
     */
    this.clientX = ev.clientX;

    /**
     * @name MouseEvent#clientY
     * @type Number
     */
    this.clientY = ev.clientY;

    /**
     * @name MouseEvent#ctrlKey
     * @type Boolean
     */
    this.ctrlKey = ev.ctrlKey;

    /**
     * @name MouseEvent#shiftKey
     * @type Boolean
     */
    this.shiftKey = ev.shiftKey;

    /**
     * @name MouseEvent#altKey
     * @type Boolean
     */
    this.altKey = ev.altKey;

    /**
     * @name MouseEvent#metaKey
     * @type Boolean
     */
    this.metaKey = ev.metaKey;

    /**
     * @type MouseEvent#button
     * @type Number
     */
    this.button = ev.button;

    /**
     * @type MouseEvent#buttons
     * @type Number
     */
    this.buttons = ev.buttons;

    /**
     * @type MouseEvent#pageX
     * @type Number
     */
    this.pageX = ev.pageX;

    /**
     * @type MouseEvent#pageY
     * @type Number
     */
    this.pageY = ev.pageY;

    /**
     * @type MouseEvent#x
     * @type Number
     */
    this.x = ev.x;

    /**
     * @type MouseEvent#y
     * @type Number
     */
    this.y = ev.y;

    /**
     * @type MouseEvent#offsetX
     * @type Number
     */
    this.offsetX = ev.offsetX;

    /**
     * @type MouseEvent#offsetY
     * @type Number
     */
    this.offsetY = ev.offsetY;
}

MouseEvent.prototype = Object.create(UIEvent.prototype);
MouseEvent.prototype.constructor = MouseEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
MouseEvent.prototype.toString = function toString () {
    return 'MouseEvent';
};

module.exports = MouseEvent;

},{"./UIEvent":23}],22:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

var EMPTY_ARRAY = [];

/**
 * See [Touch Interface](http://www.w3.org/TR/2013/REC-touch-events-20131010/#touch-interface).
 *
 * @class Touch
 * @private
 *
 * @param {Touch} touch The native Touch object.
 */
function Touch(touch) {
    // interface Touch {
    //     readonly    attribute long        identifier;
    //     readonly    attribute EventTarget target;
    //     readonly    attribute double      screenX;
    //     readonly    attribute double      screenY;
    //     readonly    attribute double      clientX;
    //     readonly    attribute double      clientY;
    //     readonly    attribute double      pageX;
    //     readonly    attribute double      pageY;
    // };

    /**
     * @name Touch#identifier
     * @type Number
     */
    this.identifier = touch.identifier;

    /**
     * @name Touch#screenX
     * @type Number
     */
    this.screenX = touch.screenX;

    /**
     * @name Touch#screenY
     * @type Number
     */
    this.screenY = touch.screenY;

    /**
     * @name Touch#clientX
     * @type Number
     */
    this.clientX = touch.clientX;

    /**
     * @name Touch#clientY
     * @type Number
     */
    this.clientY = touch.clientY;

    /**
     * @name Touch#pageX
     * @type Number
     */
    this.pageX = touch.pageX;

    /**
     * @name Touch#pageY
     * @type Number
     */
    this.pageY = touch.pageY;
}


/**
 * Normalizes the browser's native TouchList by converting it into an array of
 * normalized Touch objects.
 *
 * @method  cloneTouchList
 * @private
 *
 * @param  {TouchList} touchList    The native TouchList array.
 * @return {Array.<Touch>}          An array of normalized Touch objects.
 */
function cloneTouchList(touchList) {
    if (!touchList) return EMPTY_ARRAY;
    // interface TouchList {
    //     readonly    attribute unsigned long length;
    //     getter Touch? item (unsigned long index);
    // };

    var touchListArray = [];
    for (var i = 0; i < touchList.length; i++) {
        touchListArray[i] = new Touch(touchList[i]);
    }
    return touchListArray;
}

/**
 * See [Touch Event Interface](http://www.w3.org/TR/2013/REC-touch-events-20131010/#touchevent-interface).
 *
 * @class TouchEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function TouchEvent(ev) {
    // interface TouchEvent : UIEvent {
    //     readonly    attribute TouchList touches;
    //     readonly    attribute TouchList targetTouches;
    //     readonly    attribute TouchList changedTouches;
    //     readonly    attribute boolean   altKey;
    //     readonly    attribute boolean   metaKey;
    //     readonly    attribute boolean   ctrlKey;
    //     readonly    attribute boolean   shiftKey;
    // };
    UIEvent.call(this, ev);

    /**
     * @name TouchEvent#touches
     * @type Array.<Touch>
     */
    this.touches = cloneTouchList(ev.touches);

    /**
     * @name TouchEvent#targetTouches
     * @type Array.<Touch>
     */
    this.targetTouches = cloneTouchList(ev.targetTouches);

    /**
     * @name TouchEvent#changedTouches
     * @type TouchList
     */
    this.changedTouches = cloneTouchList(ev.changedTouches);

    /**
     * @name TouchEvent#altKey
     * @type Boolean
     */
    this.altKey = ev.altKey;

    /**
     * @name TouchEvent#metaKey
     * @type Boolean
     */
    this.metaKey = ev.metaKey;

    /**
     * @name TouchEvent#ctrlKey
     * @type Boolean
     */
    this.ctrlKey = ev.ctrlKey;

    /**
     * @name TouchEvent#shiftKey
     * @type Boolean
     */
    this.shiftKey = ev.shiftKey;
}

TouchEvent.prototype = Object.create(UIEvent.prototype);
TouchEvent.prototype.constructor = TouchEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
TouchEvent.prototype.toString = function toString () {
    return 'TouchEvent';
};

module.exports = TouchEvent;

},{"./UIEvent":23}],23:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var Event = require('./Event');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428).
 *
 * @class UIEvent
 * @augments Event
 *
 * @param  {Event} ev   The native DOM event.
 */
function UIEvent(ev) {
    // [Constructor(DOMString type, optional UIEventInit eventInitDict)]
    // interface UIEvent : Event {
    //     readonly    attribute Window? view;
    //     readonly    attribute long    detail;
    // };
    Event.call(this, ev);

    /**
     * @name UIEvent#detail
     * @type Number
     */
    this.detail = ev.detail;
}

UIEvent.prototype = Object.create(Event.prototype);
UIEvent.prototype.constructor = UIEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
UIEvent.prototype.toString = function toString () {
    return 'UIEvent';
};

module.exports = UIEvent;

},{"./Event":16}],24:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var MouseEvent = require('./MouseEvent');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#events-wheelevents).
 *
 * @class WheelEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function WheelEvent(ev) {
    // [Constructor(DOMString typeArg, optional WheelEventInit wheelEventInitDict)]
    // interface WheelEvent : MouseEvent {
    //     // DeltaModeCode
    //     const unsigned long DOM_DELTA_PIXEL = 0x00;
    //     const unsigned long DOM_DELTA_LINE = 0x01;
    //     const unsigned long DOM_DELTA_PAGE = 0x02;
    //     readonly    attribute double        deltaX;
    //     readonly    attribute double        deltaY;
    //     readonly    attribute double        deltaZ;
    //     readonly    attribute unsigned long deltaMode;
    // };

    MouseEvent.call(this, ev);

    /**
     * @name WheelEvent#DOM_DELTA_PIXEL
     * @type Number
     */
    this.DOM_DELTA_PIXEL = 0x00;

    /**
     * @name WheelEvent#DOM_DELTA_LINE
     * @type Number
     */
    this.DOM_DELTA_LINE = 0x01;

    /**
     * @name WheelEvent#DOM_DELTA_PAGE
     * @type Number
     */
    this.DOM_DELTA_PAGE = 0x02;

    /**
     * @name WheelEvent#deltaX
     * @type Number
     */
    this.deltaX = ev.deltaX;

    /**
     * @name WheelEvent#deltaY
     * @type Number
     */
    this.deltaY = ev.deltaY;

    /**
     * @name WheelEvent#deltaZ
     * @type Number
     */
    this.deltaZ = ev.deltaZ;

    /**
     * @name WheelEvent#deltaMode
     * @type Number
     */
    this.deltaMode = ev.deltaMode;
}

WheelEvent.prototype = Object.create(MouseEvent.prototype);
WheelEvent.prototype.constructor = WheelEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
WheelEvent.prototype.toString = function toString () {
    return 'WheelEvent';
};

module.exports = WheelEvent;

},{"./MouseEvent":21}],25:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * A two-dimensional vector.
 *
 * @class Vec2
 *
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 */
var Vec2 = function(x, y) {
    if (x instanceof Array || x instanceof Float32Array) {
        this.x = x[0] || 0;
        this.y = x[1] || 0;
    }
    else {
        this.x = x || 0;
        this.y = y || 0;
    }
};

/**
 * Set the components of the current Vec2.
 *
 * @method
 *
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 *
 * @return {Vec2} this
 */
Vec2.prototype.set = function set(x, y) {
    if (x != null) this.x = x;
    if (y != null) this.y = y;
    return this;
};

/**
 * Add the input v to the current Vec2.
 *
 * @method
 *
 * @param {Vec2} v The Vec2 to add.
 *
 * @return {Vec2} this
 */
Vec2.prototype.add = function add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
};

/**
 * Subtract the input v from the current Vec2.
 *
 * @method
 *
 * @param {Vec2} v The Vec2 to subtract.
 *
 * @return {Vec2} this
 */
Vec2.prototype.subtract = function subtract(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
};

/**
 * Scale the current Vec2 by a scalar or Vec2.
 *
 * @method
 *
 * @param {Number|Vec2} s The Number or vec2 by which to scale.
 *
 * @return {Vec2} this
 */
Vec2.prototype.scale = function scale(s) {
    if (s instanceof Vec2) {
        this.x *= s.x;
        this.y *= s.y;
    }
    else {
        this.x *= s;
        this.y *= s;
    }
    return this;
};

/**
 * Rotate the Vec2 counter-clockwise by theta about the z-axis.
 *
 * @method
 *
 * @param {Number} theta Angle by which to rotate.
 *
 * @return {Vec2} this
 */
Vec2.prototype.rotate = function(theta) {
    var x = this.x;
    var y = this.y;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.x = x * cosTheta - y * sinTheta;
    this.y = x * sinTheta + y * cosTheta;

    return this;
};

/**
 * The dot product of of the current Vec2 with the input Vec2.
 *
 * @method
 *
 * @param {Number} v The other Vec2.
 *
 * @return {Vec2} this
 */
Vec2.prototype.dot = function(v) {
    return this.x * v.x + this.y * v.y;
};

/**
 * The cross product of of the current Vec2 with the input Vec2.
 *
 * @method
 *
 * @param {Number} v The other Vec2.
 *
 * @return {Vec2} this
 */
Vec2.prototype.cross = function(v) {
    return this.x * v.y - this.y * v.x;
};

/**
 * Preserve the magnitude but invert the orientation of the current Vec2.
 *
 * @method
 *
 * @return {Vec2} this
 */
Vec2.prototype.invert = function invert() {
    this.x *= -1;
    this.y *= -1;
    return this;
};

/**
 * Apply a function component-wise to the current Vec2.
 *
 * @method
 *
 * @param {Function} fn Function to apply.
 *
 * @return {Vec2} this
 */
Vec2.prototype.map = function map(fn) {
    this.x = fn(this.x);
    this.y = fn(this.y);
    return this;
};

/**
 * Get the magnitude of the current Vec2.
 *
 * @method
 *
 * @return {Number} the length of the vector
 */
Vec2.prototype.length = function length() {
    var x = this.x;
    var y = this.y;

    return Math.sqrt(x * x + y * y);
};

/**
 * Copy the input onto the current Vec2.
 *
 * @method
 *
 * @param {Vec2} v Vec2 to copy
 *
 * @return {Vec2} this
 */
Vec2.prototype.copy = function copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
};

/**
 * Reset the current Vec2.
 *
 * @method
 *
 * @return {Vec2} this
 */
Vec2.prototype.clear = function clear() {
    this.x = 0;
    this.y = 0;
    return this;
};

/**
 * Check whether the magnitude of the current Vec2 is exactly 0.
 *
 * @method
 *
 * @return {Boolean} whether or not the length is 0
 */
Vec2.prototype.isZero = function isZero() {
    if (this.x !== 0 || this.y !== 0) return false;
    else return true;
};

/**
 * The array form of the current Vec2.
 *
 * @method
 *
 * @return {Array} the Vec to as an array
 */
Vec2.prototype.toArray = function toArray() {
    return [this.x, this.y];
};

/**
 * Normalize the input Vec2.
 *
 * @method
 *
 * @param {Vec2} v The reference Vec2.
 * @param {Vec2} output Vec2 in which to place the result.
 *
 * @return {Vec2} The normalized Vec2.
 */
Vec2.normalize = function normalize(v, output) {
    var x = v.x;
    var y = v.y;

    var length = Math.sqrt(x * x + y * y) || 1;
    length = 1 / length;
    output.x = v.x * length;
    output.y = v.y * length;

    return output;
};

/**
 * Clone the input Vec2.
 *
 * @method
 *
 * @param {Vec2} v The Vec2 to clone.
 *
 * @return {Vec2} The cloned Vec2.
 */
Vec2.clone = function clone(v) {
    return new Vec2(v.x, v.y);
};

/**
 * Add the input Vec2's.
 *
 * @method
 *
 * @param {Vec2} v1 The left Vec2.
 * @param {Vec2} v2 The right Vec2.
 * @param {Vec2} output Vec2 in which to place the result.
 *
 * @return {Vec2} The result of the addition.
 */
Vec2.add = function add(v1, v2, output) {
    output.x = v1.x + v2.x;
    output.y = v1.y + v2.y;

    return output;
};

/**
 * Subtract the second Vec2 from the first.
 *
 * @method
 *
 * @param {Vec2} v1 The left Vec2.
 * @param {Vec2} v2 The right Vec2.
 * @param {Vec2} output Vec2 in which to place the result.
 *
 * @return {Vec2} The result of the subtraction.
 */
Vec2.subtract = function subtract(v1, v2, output) {
    output.x = v1.x - v2.x;
    output.y = v1.y - v2.y;
    return output;
};

/**
 * Scale the input Vec2.
 *
 * @method
 *
 * @param {Vec2} v The reference Vec2.
 * @param {Number} s Number to scale by.
 * @param {Vec2} output Vec2 in which to place the result.
 *
 * @return {Vec2} The result of the scaling.
 */
Vec2.scale = function scale(v, s, output) {
    output.x = v.x * s;
    output.y = v.y * s;
    return output;
};

/**
 * The dot product of the input Vec2's.
 *
 * @method
 *
 * @param {Vec2} v1 The left Vec2.
 * @param {Vec2} v2 The right Vec2.
 *
 * @return {Number} The dot product.
 */
Vec2.dot = function dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
};

/**
 * The cross product of the input Vec2's.
 *
 * @method
 *
 * @param {Number} v1 The left Vec2.
 * @param {Number} v2 The right Vec2.
 *
 * @return {Number} The z-component of the cross product.
 */
Vec2.cross = function(v1,v2) {
    return v1.x * v2.y - v1.y * v2.x;
};

module.exports = Vec2;

},{}],26:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * A three-dimensional vector.
 *
 * @class Vec3
 *
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 * @param {Number} z The z component.
 */
var Vec3 = function(x ,y, z){
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
};

/**
 * Set the components of the current Vec3.
 *
 * @method
 *
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 * @param {Number} z The z component.
 *
 * @return {Vec3} this
 */
Vec3.prototype.set = function set(x, y, z) {
    if (x != null) this.x = x;
    if (y != null) this.y = y;
    if (z != null) this.z = z;

    return this;
};

/**
 * Add the input v to the current Vec3.
 *
 * @method
 *
 * @param {Vec3} v The Vec3 to add.
 *
 * @return {Vec3} this
 */
Vec3.prototype.add = function add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;

    return this;
};

/**
 * Subtract the input v from the current Vec3.
 *
 * @method
 *
 * @param {Vec3} v The Vec3 to subtract.
 *
 * @return {Vec3} this
 */
Vec3.prototype.subtract = function subtract(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;

    return this;
};

/**
 * Rotate the current Vec3 by theta clockwise about the x axis.
 *
 * @method
 *
 * @param {Number} theta Angle by which to rotate.
 *
 * @return {Vec3} this
 */
Vec3.prototype.rotateX = function rotateX(theta) {
    var y = this.y;
    var z = this.z;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.y = y * cosTheta - z * sinTheta;
    this.z = y * sinTheta + z * cosTheta;

    return this;
};

/**
 * Rotate the current Vec3 by theta clockwise about the y axis.
 *
 * @method
 *
 * @param {Number} theta Angle by which to rotate.
 *
 * @return {Vec3} this
 */
Vec3.prototype.rotateY = function rotateY(theta) {
    var x = this.x;
    var z = this.z;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.x = z * sinTheta + x * cosTheta;
    this.z = z * cosTheta - x * sinTheta;

    return this;
};

/**
 * Rotate the current Vec3 by theta clockwise about the z axis.
 *
 * @method
 *
 * @param {Number} theta Angle by which to rotate.
 *
 * @return {Vec3} this
 */
Vec3.prototype.rotateZ = function rotateZ(theta) {
    var x = this.x;
    var y = this.y;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.x = x * cosTheta - y * sinTheta;
    this.y = x * sinTheta + y * cosTheta;

    return this;
};

/**
 * The dot product of the current Vec3 with input Vec3 v.
 *
 * @method
 *
 * @param {Vec3} v The other Vec3.
 *
 * @return {Vec3} this
 */
Vec3.prototype.dot = function dot(v) {
    return this.x*v.x + this.y*v.y + this.z*v.z;
};

/**
 * The dot product of the current Vec3 with input Vec3 v.
 * Stores the result in the current Vec3.
 *
 * @method cross
 *
 * @param {Vec3} v The other Vec3
 *
 * @return {Vec3} this
 */
Vec3.prototype.cross = function cross(v) {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var vx = v.x;
    var vy = v.y;
    var vz = v.z;

    this.x = y * vz - z * vy;
    this.y = z * vx - x * vz;
    this.z = x * vy - y * vx;
    return this;
};

/**
 * Scale the current Vec3 by a scalar.
 *
 * @method
 *
 * @param {Number} s The Number by which to scale
 *
 * @return {Vec3} this
 */
Vec3.prototype.scale = function scale(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;

    return this;
};

/**
 * Preserve the magnitude but invert the orientation of the current Vec3.
 *
 * @method
 *
 * @return {Vec3} this
 */
Vec3.prototype.invert = function invert() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;

    return this;
};

/**
 * Apply a function component-wise to the current Vec3.
 *
 * @method
 *
 * @param {Function} fn Function to apply.
 *
 * @return {Vec3} this
 */
Vec3.prototype.map = function map(fn) {
    this.x = fn(this.x);
    this.y = fn(this.y);
    this.z = fn(this.z);

    return this;
};

/**
 * The magnitude of the current Vec3.
 *
 * @method
 *
 * @return {Number} the magnitude of the Vec3
 */
Vec3.prototype.length = function length() {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    return Math.sqrt(x * x + y * y + z * z);
};

/**
 * The magnitude squared of the current Vec3.
 *
 * @method
 *
 * @return {Number} magnitude of the Vec3 squared
 */
Vec3.prototype.lengthSq = function lengthSq() {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    return x * x + y * y + z * z;
};

/**
 * Copy the input onto the current Vec3.
 *
 * @method
 *
 * @param {Vec3} v Vec3 to copy
 *
 * @return {Vec3} this
 */
Vec3.prototype.copy = function copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
};

/**
 * Reset the current Vec3.
 *
 * @method
 *
 * @return {Vec3} this
 */
Vec3.prototype.clear = function clear() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    return this;
};

/**
 * Check whether the magnitude of the current Vec3 is exactly 0.
 *
 * @method
 *
 * @return {Boolean} whether or not the magnitude is zero
 */
Vec3.prototype.isZero = function isZero() {
    return this.x === 0 && this.y === 0 && this.z === 0;
};

/**
 * The array form of the current Vec3.
 *
 * @method
 *
 * @return {Array} a three element array representing the components of the Vec3
 */
Vec3.prototype.toArray = function toArray() {
    return [this.x, this.y, this.z];
};

/**
 * Preserve the orientation but change the length of the current Vec3 to 1.
 *
 * @method
 *
 * @return {Vec3} this
 */
Vec3.prototype.normalize = function normalize() {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var len = Math.sqrt(x * x + y * y + z * z) || 1;
    len = 1 / len;

    this.x *= len;
    this.y *= len;
    this.z *= len;
    return this;
};

/**
 * Apply the rotation corresponding to the input (unit) Quaternion
 * to the current Vec3.
 *
 * @method
 *
 * @param {Quaternion} q Unit Quaternion representing the rotation to apply
 *
 * @return {Vec3} this
 */
Vec3.prototype.applyRotation = function applyRotation(q) {
    var cw = q.w;
    var cx = -q.x;
    var cy = -q.y;
    var cz = -q.z;

    var vx = this.x;
    var vy = this.y;
    var vz = this.z;

    var tw = -cx * vx - cy * vy - cz * vz;
    var tx = vx * cw + vy * cz - cy * vz;
    var ty = vy * cw + cx * vz - vx * cz;
    var tz = vz * cw + vx * cy - cx * vy;

    var w = cw;
    var x = -cx;
    var y = -cy;
    var z = -cz;

    this.x = tx * w + x * tw + y * tz - ty * z;
    this.y = ty * w + y * tw + tx * z - x * tz;
    this.z = tz * w + z * tw + x * ty - tx * y;
    return this;
};

/**
 * Apply the input Mat33 the the current Vec3.
 *
 * @method
 *
 * @param {Mat33} matrix Mat33 to apply
 *
 * @return {Vec3} this
 */
Vec3.prototype.applyMatrix = function applyMatrix(matrix) {
    var M = matrix.get();

    var x = this.x;
    var y = this.y;
    var z = this.z;

    this.x = M[0]*x + M[1]*y + M[2]*z;
    this.y = M[3]*x + M[4]*y + M[5]*z;
    this.z = M[6]*x + M[7]*y + M[8]*z;
    return this;
};

/**
 * Normalize the input Vec3.
 *
 * @method
 *
 * @param {Vec3} v The reference Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Vec3} The normalize Vec3.
 */
Vec3.normalize = function normalize(v, output) {
    var x = v.x;
    var y = v.y;
    var z = v.z;

    var length = Math.sqrt(x * x + y * y + z * z) || 1;
    length = 1 / length;

    output.x = x * length;
    output.y = y * length;
    output.z = z * length;
    return output;
};

/**
 * Apply a rotation to the input Vec3.
 *
 * @method
 *
 * @param {Vec3} v The reference Vec3.
 * @param {Quaternion} q Unit Quaternion representing the rotation to apply.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Vec3} The rotated version of the input Vec3.
 */
Vec3.applyRotation = function applyRotation(v, q, output) {
    var cw = q.w;
    var cx = -q.x;
    var cy = -q.y;
    var cz = -q.z;

    var vx = v.x;
    var vy = v.y;
    var vz = v.z;

    var tw = -cx * vx - cy * vy - cz * vz;
    var tx = vx * cw + vy * cz - cy * vz;
    var ty = vy * cw + cx * vz - vx * cz;
    var tz = vz * cw + vx * cy - cx * vy;

    var w = cw;
    var x = -cx;
    var y = -cy;
    var z = -cz;

    output.x = tx * w + x * tw + y * tz - ty * z;
    output.y = ty * w + y * tw + tx * z - x * tz;
    output.z = tz * w + z * tw + x * ty - tx * y;
    return output;
};

/**
 * Clone the input Vec3.
 *
 * @method
 *
 * @param {Vec3} v The Vec3 to clone.
 *
 * @return {Vec3} The cloned Vec3.
 */
Vec3.clone = function clone(v) {
    return new Vec3(v.x, v.y, v.z);
};

/**
 * Add the input Vec3's.
 *
 * @method
 *
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Vec3} The result of the addition.
 */
Vec3.add = function add(v1, v2, output) {
    output.x = v1.x + v2.x;
    output.y = v1.y + v2.y;
    output.z = v1.z + v2.z;
    return output;
};

/**
 * Subtract the second Vec3 from the first.
 *
 * @method
 *
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Vec3} The result of the subtraction.
 */
Vec3.subtract = function subtract(v1, v2, output) {
    output.x = v1.x - v2.x;
    output.y = v1.y - v2.y;
    output.z = v1.z - v2.z;
    return output;
};

/**
 * Scale the input Vec3.
 *
 * @method
 *
 * @param {Vec3} v The reference Vec3.
 * @param {Number} s Number to scale by.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Vec3} The result of the scaling.
 */
Vec3.scale = function scale(v, s, output) {
    output.x = v.x * s;
    output.y = v.y * s;
    output.z = v.z * s;
    return output;
};

/**
 * The dot product of the input Vec3's.
 *
 * @method
 *
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 *
 * @return {Number} The dot product.
 */
Vec3.dot = function dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
};

/**
 * The (right-handed) cross product of the input Vec3's.
 * v1 x v2.
 *
 * @method
 *
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Object} the object the result of the cross product was placed into
 */
Vec3.cross = function cross(v1, v2, output) {
    var x1 = v1.x;
    var y1 = v1.y;
    var z1 = v1.z;
    var x2 = v2.x;
    var y2 = v2.y;
    var z2 = v2.z;

    output.x = y1 * z2 - z1 * y2;
    output.y = z1 * x2 - x1 * z2;
    output.z = x1 * y2 - y1 * x2;
    return output;
};

/**
 * The projection of v1 onto v2.
 *
 * @method
 *
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Object} the object the result of the cross product was placed into 
 */
Vec3.project = function project(v1, v2, output) {
    var x1 = v1.x;
    var y1 = v1.y;
    var z1 = v1.z;
    var x2 = v2.x;
    var y2 = v2.y;
    var z2 = v2.z;

    var scale = x1 * x2 + y1 * y2 + z1 * z2;
    scale /= x2 * x2 + y2 * y2 + z2 * z2;

    output.x = x2 * scale;
    output.y = y2 * scale;
    output.z = z2 * scale;

    return output;
};

module.exports = Vec3;

},{}],27:[function(require,module,exports){
module.exports = noop

function noop() {
  throw new Error(
      'You should bundle your code ' +
      'using `glslify` as a transform.'
  )
}

},{}],28:[function(require,module,exports){
module.exports = programify

function programify(vertex, fragment, uniforms, attributes) {
  return {
    vertex: vertex, 
    fragment: fragment,
    uniforms: uniforms, 
    attributes: attributes
  };
}

},{}],29:[function(require,module,exports){
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
// MIT license

'use strict';

var lastTime = 0;
var vendors = ['ms', 'moz', 'webkit', 'o'];

var rAF, cAF;

if (typeof window === 'object') {
    rAF = window.requestAnimationFrame;
    cAF = window.cancelAnimationFrame || window.cancelRequestAnimationFrame;
    for (var x = 0; x < vendors.length && !rAF; ++x) {
        rAF = window[vendors[x] + 'RequestAnimationFrame'];
        cAF = window[vendors[x] + 'CancelRequestAnimationFrame'] ||
              window[vendors[x] + 'CancelAnimationFrame'];
    }

    if (rAF && !cAF) {
        // cAF not supported.
        // Fall back to setInterval for now (very rare).
        rAF = null;
    }
}

if (!rAF) {
    var now = Date.now ? Date.now : function () {
        return new Date().getTime();
    };

    rAF = function(callback) {
        var currTime = now();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = setTimeout(function () {
            callback(currTime + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };

    cAF = function (id) {
        clearTimeout(id);
    };
}

var animationFrame = {
    /**
     * Cross browser version of [requestAnimationFrame]{@link https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame}.
     *
     * Used by Engine in order to establish a render loop.
     *
     * If no (vendor prefixed version of) `requestAnimationFrame` is available,
     * `setTimeout` will be used in order to emulate a render loop running at
     * approximately 60 frames per second.
     *
     * @method  requestAnimationFrame
     *
     * @param   {Function}  callback function to be invoked on the next frame.
     * @return  {Number}    requestId to be used to cancel the request using
     *                      @link{cancelAnimationFrame}.
     */
    requestAnimationFrame: rAF,

    /**
     * Cross browser version of [cancelAnimationFrame]{@link https://developer.mozilla.org/en-US/docs/Web/API/window/cancelAnimationFrame}.
     *
     * Cancels a previously using [requestAnimationFrame]{@link animationFrame#requestAnimationFrame}
     * scheduled request.
     *
     * Used for immediately stopping the render loop within the Engine.
     *
     * @method  cancelAnimationFrame
     *
     * @param   {Number}    requestId of the scheduled callback function
     *                      returned by [requestAnimationFrame]{@link animationFrame#requestAnimationFrame}.
     */
    cancelAnimationFrame: cAF
};

module.exports = animationFrame;

},{}],30:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

module.exports = {
    requestAnimationFrame: require('./animationFrame').requestAnimationFrame,
    cancelAnimationFrame: require('./animationFrame').cancelAnimationFrame
};

},{"./animationFrame":29}],31:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var polyfills = require('../polyfills');
var rAF = polyfills.requestAnimationFrame;
var cAF = polyfills.cancelAnimationFrame;

/**
 * Boolean constant indicating whether the RequestAnimationFrameLoop has access to the document.
 * The document is being used in order to subscribe for visibilitychange events
 * used for normalizing the RequestAnimationFrameLoop time when e.g. when switching tabs.
 * 
 * @constant
 * @type {Boolean}
 */ 
var DOCUMENT_ACCESS = typeof document !== 'undefined';

if (DOCUMENT_ACCESS) {
    var VENDOR_HIDDEN, VENDOR_VISIBILITY_CHANGE;

    // Opera 12.10 and Firefox 18 and later support
    if (typeof document.hidden !== 'undefined') {
        VENDOR_HIDDEN = 'hidden';
        VENDOR_VISIBILITY_CHANGE = 'visibilitychange';
    }
    else if (typeof document.mozHidden !== 'undefined') {
        VENDOR_HIDDEN = 'mozHidden';
        VENDOR_VISIBILITY_CHANGE = 'mozvisibilitychange';
    }
    else if (typeof document.msHidden !== 'undefined') {
        VENDOR_HIDDEN = 'msHidden';
        VENDOR_VISIBILITY_CHANGE = 'msvisibilitychange';
    }
    else if (typeof document.webkitHidden !== 'undefined') {
        VENDOR_HIDDEN = 'webkitHidden';
        VENDOR_VISIBILITY_CHANGE = 'webkitvisibilitychange';
    }
}

/**
 * RequestAnimationFrameLoop class used for updating objects on a frame-by-frame. Synchronizes the
 * `update` method invocations to the refresh rate of the screen. Manages
 * the `requestAnimationFrame`-loop by normalizing the passed in timestamp
 * when switching tabs.
 * 
 * @class RequestAnimationFrameLoop
 */
function RequestAnimationFrameLoop() {
    var _this = this;
    
    // References to objects to be updated on next frame.
    this._updates = [];
    
    this._looper = function(time) {
        _this.loop(time);
    };
    this._time = 0;
    this._stoppedAt = 0;
    this._sleep = 0;
    
    // Indicates whether the engine should be restarted when the tab/ window is
    // being focused again (visibility change).
    this._startOnVisibilityChange = true;
    
    // requestId as returned by requestAnimationFrame function;
    this._rAF = null;
    
    this._sleepDiff = true;
    
    // The engine is being started on instantiation.
    // TODO(alexanderGugel)
    this.start();

    // The RequestAnimationFrameLoop supports running in a non-browser environment (e.g. Worker).
    if (DOCUMENT_ACCESS) {
        document.addEventListener(VENDOR_VISIBILITY_CHANGE, function() {
            _this._onVisibilityChange();
        });
    }
}

/**
 * Handle the switching of tabs.
 *
 * @method
 * _private
 * 
 * @return {undefined} undefined
 */
RequestAnimationFrameLoop.prototype._onVisibilityChange = function _onVisibilityChange() {
    if (document[VENDOR_HIDDEN]) {
        this._onUnfocus();
    }
    else {
        this._onFocus();
    }
};

/**
 * Internal helper function to be invoked as soon as the window/ tab is being
 * focused after a visibiltiy change.
 * 
 * @method
 * @private
 *
 * @return {undefined} undefined
 */ 
RequestAnimationFrameLoop.prototype._onFocus = function _onFocus() {
    if (this._startOnVisibilityChange) {
        this._start();
    }
};

/**
 * Internal helper function to be invoked as soon as the window/ tab is being
 * unfocused (hidden) after a visibiltiy change.
 * 
 * @method  _onFocus
 * @private
 *
 * @return {undefined} undefined
 */ 
RequestAnimationFrameLoop.prototype._onUnfocus = function _onUnfocus() {
    this._stop();
};

/**
 * Starts the RequestAnimationFrameLoop. When switching to a differnt tab/ window (changing the
 * visibiltiy), the engine will be retarted when switching back to a visible
 * state.
 *
 * @method
 * 
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.start = function start() {
    if (!this._running) {
        this._startOnVisibilityChange = true;
        this._start();
    }
    return this;
};

/**
 * Internal version of RequestAnimationFrameLoop's start function, not affecting behavior on visibilty
 * change.
 * 
 * @method
 * @private
*
 * @return {undefined} undefined
 */ 
RequestAnimationFrameLoop.prototype._start = function _start() {
    this._running = true;
    this._sleepDiff = true;
    this._rAF = rAF(this._looper);
};

/**
 * Stops the RequestAnimationFrameLoop.
 *
 * @method
 * 
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.stop = function stop() {
    if (this._running) {
        this._startOnVisibilityChange = false;
        this._stop();
    }
    return this;
};

/**
 * Internal version of RequestAnimationFrameLoop's stop function, not affecting behavior on visibilty
 * change.
 * 
 * @method
 * @private
 *
 * @return {undefined} undefined
 */ 
RequestAnimationFrameLoop.prototype._stop = function _stop() {
    this._running = false;
    this._stoppedAt = this._time;

    // Bug in old versions of Fx. Explicitly cancel.
    cAF(this._rAF);
};

/**
 * Determines whether the RequestAnimationFrameLoop is currently running or not.
 *
 * @method
 * 
 * @return {Boolean} boolean value indicating whether the RequestAnimationFrameLoop is currently running or not
 */
RequestAnimationFrameLoop.prototype.isRunning = function isRunning() {
    return this._running;
};

/**
 * Updates all registered objects.
 *
 * @method
 * 
 * @param {Number} time high resolution timstamp used for invoking the `update` method on all registered objects
 *
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.step = function step (time) {
    this._time = time;
    if (this._sleepDiff) {
        this._sleep += time - this._stoppedAt;
        this._sleepDiff = false;
    }
    
    // The same timetamp will be emitted immediately before and after visibility
    // change.
    var normalizedTime = time - this._sleep;
    for (var i = 0, len = this._updates.length ; i < len ; i++) {
        this._updates[i].update(normalizedTime);
    }
    return this;
};

/**
 * Method being called by `requestAnimationFrame` on every paint. Indirectly
 * recursive by scheduling a future invocation of itself on the next paint.
 *
 * @method
 * 
 * @param {Number} time high resolution timstamp used for invoking the `update` method on all registered objects
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.loop = function loop(time) {
    this.step(time);
    this._rAF = rAF(this._looper);
    return this;
};

/**
 * Registeres an updateable object which `update` method should be invoked on
 * every paint, starting on the next paint (assuming the RequestAnimationFrameLoop is running).
 *
 * @method
 * 
 * @param {Object} updateable object to be updated
 * @param {Function} updateable.update update function to be called on the registered object
 *
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.update = function update(updateable) {
    if (this._updates.indexOf(updateable) === -1) {
        this._updates.push(updateable);
    }
    return this;
};

/**
 * Deregisters an updateable object previously registered using `update` to be
 * no longer updated.
 *
 * @method
 * 
 * @param {Object} updateable updateable object previously registered using `update`
 *
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.noLongerUpdate = function noLongerUpdate(updateable) {
    var index = this._updates.indexOf(updateable);
    if (index > -1) {
        this._updates.splice(index, 1);
    }
    return this;
};

module.exports = RequestAnimationFrameLoop;

},{"../polyfills":30}],32:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var Context = require('./Context');
var injectCSS = require('./inject-css');

/**
 * Instantiates a new Compositor.
 * The Compositor receives draw commands frm the UIManager and routes the to the
 * respective context objects.
 *
 * Upon creation, it injects a stylesheet used for styling the individual
 * renderers used in the context objects.
 *
 * @class Compositor
 * @constructor
 * @return {undefined} undefined
 */
function Compositor() {
    injectCSS();

    this._contexts = {};
    this._outCommands = [];
    this._inCommands = [];
    this._time = null;

    this._resized = false;

    var _this = this;
    window.addEventListener('resize', function() {
        _this._resized = true;
    });
}

/**
 * Retrieves the time being used by the internal clock managed by
 * `FamousEngine`.
 *
 * The time is being passed into core by the Engine through the UIManager.
 * Since core has the ability to scale the time, the time needs to be passed
 * back to the rendering system.
 *
 * @method
 *
 * @return {Number} time The clock time used in core.
 */
Compositor.prototype.getTime = function getTime() {
    return this._time;
};

/**
 * Schedules an event to be sent the next time the out command queue is being
 * flushed.
 *
 * @method
 * @private
 *
 * @param  {String} path Render path to the node the event should be triggered
 * on (*targeted event*)
 * @param  {String} ev Event type
 * @param  {Object} payload Event object (serializable using structured cloning
 * algorithm)
 *
 * @return {undefined} undefined
 */
Compositor.prototype.sendEvent = function sendEvent(path, ev, payload) {
    this._outCommands.push('WITH', path, 'TRIGGER', ev, payload);
};

/**
 * Internal helper method used for notifying externally
 * resized contexts (e.g. by resizing the browser window).
 *
 * @method
 * @private
 *
 * @param  {String} selector render path to the node (context) that should be
 * resized
 * @param  {Array} size new context size
 *
 * @return {undefined} undefined
 */
Compositor.prototype.sendResize = function sendResize (selector, size) {
    this.sendEvent(selector, 'CONTEXT_RESIZE', size);
};

/**
 * Internal helper method used by `drawCommands`.
 * Subsequent commands are being associated with the node defined the the path
 * following the `WITH` command.
 *
 * @method
 * @private
 *
 * @param  {Number} iterator position index within the commands queue
 * @param  {Array} commands remaining message queue received, used to
 * shift single messages from
 *
 * @return {undefined} undefined
 */
Compositor.prototype.handleWith = function handleWith (iterator, commands) {
    var path = commands[iterator];
    var pathArr = path.split('/');
    var context = this.getOrSetContext(pathArr.shift());
    return context.receive(path, commands, iterator);
};

/**
 * Retrieves the top-level Context associated with the passed in document
 * query selector. If no such Context exists, a new one will be instantiated.
 *
 * @method
 * @private
 *
 * @param  {String} selector document query selector used for retrieving the
 * DOM node the VirtualElement should be attached to
 *
 * @return {Context} context
 */
Compositor.prototype.getOrSetContext = function getOrSetContext(selector) {
    if (this._contexts[selector]) {
        return this._contexts[selector];
    }
    else {
        var context = new Context(selector, this);
        this._contexts[selector] = context;
        return context;
    }
};

/**
 * Internal helper method used by `drawCommands`.
 *
 * @method
 * @private
 *
 * @param  {Number} iterator position index within the command queue
 * @param  {Array} commands remaining message queue received, used to
 * shift single messages
 *
 * @return {undefined} undefined
 */
Compositor.prototype.giveSizeFor = function giveSizeFor(iterator, commands) {
    var selector = commands[iterator];
    var size = this.getOrSetContext(selector).getRootSize();
    this.sendResize(selector, size);
};

/**
 * Processes the previously via `receiveCommands` updated incoming "in"
 * command queue.
 * Called by UIManager on a frame by frame basis.
 *
 * @method
 *
 * @return {Array} outCommands set of commands to be sent back
 */
Compositor.prototype.drawCommands = function drawCommands() {
    var commands = this._inCommands;
    var localIterator = 0;
    var command = commands[localIterator];
    while (command) {
        switch (command) {
            case 'TIME':
                this._time = commands[++localIterator];
                break;
            case 'WITH':
                localIterator = this.handleWith(++localIterator, commands);
                break;
            case 'NEED_SIZE_FOR':
                this.giveSizeFor(++localIterator, commands);
                break;
        }
        command = commands[++localIterator];
    }

    // TODO: Switch to associative arrays here...

    for (var key in this._contexts) {
        this._contexts[key].draw();
    }

    if (this._resized) {
        this.updateSize();
    }

    return this._outCommands;
};


/**
 * Updates the size of all previously registered context objects.
 * This results into CONTEXT_RESIZE events being sent and the root elements
 * used by the individual renderers being resized to the the DOMRenderer's root
 * size.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Compositor.prototype.updateSize = function updateSize() {
    for (var selector in this._contexts) {
        this._contexts[selector].updateSize();
    }
};

/**
 * Used by ThreadManager to update the internal queue of incoming commands.
 * Receiving commands does not immediately start the rendering process.
 *
 * @method
 *
 * @param  {Array} commands command queue to be processed by the compositor's
 * `drawCommands` method
 *
 * @return {undefined} undefined
 */
Compositor.prototype.receiveCommands = function receiveCommands(commands) {
    var len = commands.length;
    for (var i = 0; i < len; i++) {
        this._inCommands.push(commands[i]);
    }
};

/**
 * Flushes the queue of outgoing "out" commands.
 * Called by ThreadManager.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Compositor.prototype.clearCommands = function clearCommands() {
    this._inCommands.length = 0;
    this._outCommands.length = 0;
    this._resized = false;
};

module.exports = Compositor;

},{"./Context":33,"./inject-css":35}],33:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var WebGLRenderer = require('../webgl-renderers/WebGLRenderer');
var Camera = require('../components/Camera');
var DOMRenderer = require('../dom-renderers/DOMRenderer');

/**
 * Context is a render layer with its own WebGLRenderer and DOMRenderer.
 * It is the interface between the Compositor which receives commands
 * and the renderers that interpret them. It also relays information to
 * the renderers about resizing.
 *
 * The DOMElement at the given query selector is used as the root. A
 * new DOMElement is appended to this root element, and used as the
 * parent element for all Famous DOM rendering at this context. A
 * canvas is added and used for all WebGL rendering at this context.
 *
 * @class Context
 * @constructor
 *
 * @param {String} selector Query selector used to locate root element of
 * context layer.
 * @param {Compositor} compositor Compositor reference to pass down to
 * WebGLRenderer.
 *
 * @return {undefined} undefined
 */
function Context(selector, compositor) {
    this._compositor = compositor;
    this._rootEl = document.querySelector(selector);

    this._selector = selector;

    // Create DOM element to be used as root for all famous DOM
    // rendering and append element to the root element.

    var DOMLayerEl = document.createElement('div');
    this._rootEl.appendChild(DOMLayerEl);

    // Instantiate renderers

    this.DOMRenderer = new DOMRenderer(DOMLayerEl, selector, compositor);
    this.WebGLRenderer = null;
    this.canvas = null;

    // State holders

    this._renderState = {
        projectionType: Camera.ORTHOGRAPHIC_PROJECTION,
        perspectiveTransform: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
        viewTransform: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
        viewDirty: false,
        perspectiveDirty: false
    };

    this._size = [];
    this._children = {};
    this._elementHash = {};

    this._meshTransform = [];
    this._meshSize = [0, 0, 0];
}

/**
 * Queries DOMRenderer size and updates canvas size. Relays size information to
 * WebGLRenderer.
 *
 * @return {Context} this
 */
Context.prototype.updateSize = function () {
    var newSize = this.DOMRenderer.getSize();
    this._compositor.sendResize(this._selector, newSize);

    var width = newSize[0];
    var height = newSize[1];

    this._size[0] = width;
    this._size[1] = height;
    this._size[2] = (width > height) ? width : height;

    if (this.canvas) {
        this.canvas.width  = width;
        this.canvas.height = height;
    }

    if (this.WebGLRenderer) this.WebGLRenderer.updateSize(this._size);

    return this;
};

/**
 * Draw function called after all commands have been handled for current frame.
 * Issues draw commands to all renderers with current renderState.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Context.prototype.draw = function draw() {
    this.DOMRenderer.draw(this._renderState);
    if (this.WebGLRenderer) this.WebGLRenderer.draw(this._renderState);

    if (this._renderState.perspectiveDirty) this._renderState.perspectiveDirty = false;
    if (this._renderState.viewDirty) this._renderState.viewDirty = false;
};

/**
 * Gets the size of the parent element of the DOMRenderer for this context.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Context.prototype.getRootSize = function getRootSize() {
    return this.DOMRenderer.getSize();
};

/**
 * Handles initialization of WebGLRenderer when necessary, including creation
 * of the canvas element and instantiation of the renderer. Also updates size
 * to pass size information to the renderer.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Context.prototype.initWebGL = function initWebGL() {
    this.canvas = document.createElement('canvas');
    this._rootEl.appendChild(this.canvas);
    this.WebGLRenderer = new WebGLRenderer(this.canvas, this._compositor);
    this.updateSize();
};

/**
 * Handles delegation of commands to renderers of this context.
 *
 * @method
 *
 * @param {String} path String used as identifier of a given node in the
 * scene graph.
 * @param {Array} commands List of all commands from this frame.
 * @param {Number} iterator Number indicating progress through the command
 * queue.
 *
 * @return {Number} iterator indicating progress through the command queue.
 */
Context.prototype.receive = function receive(path, commands, iterator) {
    var localIterator = iterator;

    var command = commands[++localIterator];
    this.DOMRenderer.loadPath(path);
    this.DOMRenderer.findTarget();
    while (command) {

        switch (command) {
            case 'INIT_DOM':
                this.DOMRenderer.insertEl(commands[++localIterator]);
                break;

            case 'DOM_RENDER_SIZE':
                this.DOMRenderer.getSizeOf(commands[++localIterator]);
                break;

            case 'CHANGE_TRANSFORM':
                for (var i = 0 ; i < 16 ; i++) this._meshTransform[i] = commands[++localIterator];

                this.DOMRenderer.setMatrix(this._meshTransform);

                if (this.WebGLRenderer)
                    this.WebGLRenderer.setCutoutUniform(path, 'u_transform', this._meshTransform);

                break;

            case 'CHANGE_SIZE':
                var width = commands[++localIterator];
                var height = commands[++localIterator];

                this.DOMRenderer.setSize(width, height);
                if (this.WebGLRenderer) {
                    this._meshSize[0] = width;
                    this._meshSize[1] = height;
                    this.WebGLRenderer.setCutoutUniform(path, 'u_size', this._meshSize);
                }
                break;

            case 'CHANGE_PROPERTY':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.setProperty(commands[++localIterator], commands[++localIterator]);
                break;

            case 'CHANGE_CONTENT':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.setContent(commands[++localIterator]);
                break;

            case 'CHANGE_ATTRIBUTE':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.setAttribute(commands[++localIterator], commands[++localIterator]);
                break;

            case 'ADD_CLASS':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.addClass(commands[++localIterator]);
                break;

            case 'REMOVE_CLASS':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.removeClass(commands[++localIterator]);
                break;

            case 'SUBSCRIBE':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.subscribe(commands[++localIterator], commands[++localIterator]);
                break;

            case 'GL_SET_DRAW_OPTIONS':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setMeshOptions(path, commands[++localIterator]);
                break;

            case 'GL_AMBIENT_LIGHT':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setAmbientLightColor(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_LIGHT_POSITION':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setLightPosition(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_LIGHT_COLOR':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setLightColor(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'MATERIAL_INPUT':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.handleMaterialInput(
                    path,
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_SET_GEOMETRY':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setGeometry(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_UNIFORMS':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setMeshUniform(
                    path,
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_BUFFER_DATA':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.bufferData(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_CUTOUT_STATE':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setCutoutState(path, commands[++localIterator]);
                break;

            case 'GL_MESH_VISIBILITY':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setMeshVisibility(path, commands[++localIterator]);
                break;

            case 'GL_REMOVE_MESH':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.removeMesh(path);
                break;

            case 'PINHOLE_PROJECTION':
                this._renderState.projectionType = Camera.PINHOLE_PROJECTION;
                this._renderState.perspectiveTransform[11] = -1 / commands[++localIterator];

                this._renderState.perspectiveDirty = true;
                break;

            case 'ORTHOGRAPHIC_PROJECTION':
                this._renderState.projectionType = Camera.ORTHOGRAPHIC_PROJECTION;
                this._renderState.perspectiveTransform[11] = 0;

                this._renderState.perspectiveDirty = true;
                break;

            case 'CHANGE_VIEW_TRANSFORM':
                this._renderState.viewTransform[0] = commands[++localIterator];
                this._renderState.viewTransform[1] = commands[++localIterator];
                this._renderState.viewTransform[2] = commands[++localIterator];
                this._renderState.viewTransform[3] = commands[++localIterator];

                this._renderState.viewTransform[4] = commands[++localIterator];
                this._renderState.viewTransform[5] = commands[++localIterator];
                this._renderState.viewTransform[6] = commands[++localIterator];
                this._renderState.viewTransform[7] = commands[++localIterator];

                this._renderState.viewTransform[8] = commands[++localIterator];
                this._renderState.viewTransform[9] = commands[++localIterator];
                this._renderState.viewTransform[10] = commands[++localIterator];
                this._renderState.viewTransform[11] = commands[++localIterator];

                this._renderState.viewTransform[12] = commands[++localIterator];
                this._renderState.viewTransform[13] = commands[++localIterator];
                this._renderState.viewTransform[14] = commands[++localIterator];
                this._renderState.viewTransform[15] = commands[++localIterator];

                this._renderState.viewDirty = true;
                break;

            case 'WITH': return localIterator - 1;
        }

        command = commands[++localIterator];
    }

    return localIterator;
};

module.exports = Context;

},{"../components/Camera":1,"../dom-renderers/DOMRenderer":12,"../webgl-renderers/WebGLRenderer":49}],34:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * The UIManager is being updated by an Engine by consecutively calling its
 * `update` method. It can either manage a real Web-Worker or the global
 * FamousEngine core singleton.
 *
 * @example
 * var compositor = new Compositor();
 * var engine = new Engine();
 *
 * // Using a Web Worker
 * var worker = new Worker('worker.bundle.js');
 * var threadmanger = new UIManager(worker, compositor, engine);
 *
 * // Without using a Web Worker
 * var threadmanger = new UIManager(Famous, compositor, engine);
 *
 * @class  UIManager
 * @constructor
 *
 * @param {Famous|Worker} thread The thread being used to receive messages
 * from and post messages to. Expected to expose a WebWorker-like API, which
 * means providing a way to listen for updates by setting its `onmessage`
 * property and sending updates using `postMessage`.
 * @param {Compositor} compositor an instance of Compositor used to extract
 * enqueued draw commands from to be sent to the thread.
 * @param {RenderLoop} renderLoop an instance of Engine used for executing
 * the `ENGINE` commands on.
 */
function UIManager (thread, compositor, renderLoop) {
    this._thread = thread;
    this._compositor = compositor;
    this._renderLoop = renderLoop;

    this._renderLoop.update(this);

    var _this = this;
    this._thread.onmessage = function (ev) {
        var message = ev.data ? ev.data : ev;
        if (message[0] === 'ENGINE') {
            switch (message[1]) {
                case 'START':
                    _this._renderLoop.start();
                    break;
                case 'STOP':
                    _this._renderLoop.stop();
                    break;
                default:
                    console.error(
                        'Unknown ENGINE command "' + message[1] + '"'
                    );
                    break;
            }
        }
        else {
            _this._compositor.receiveCommands(message);
        }
    };
    this._thread.onerror = function (error) {
        console.error(error);
    };
}

/**
 * Returns the thread being used by the UIManager.
 * This could either be an an actual web worker or a `FamousEngine` singleton.
 *
 * @method
 *
 * @return {Worker|FamousEngine} Either a web worker or a `FamousEngine` singleton.
 */
UIManager.prototype.getThread = function getThread() {
    return this._thread;
};

/**
 * Returns the compositor being used by this UIManager.
 *
 * @method
 *
 * @return {Compositor} The compositor used by the UIManager.
 */
UIManager.prototype.getCompositor = function getCompositor() {
    return this._compositor;
};

/**
 * Returns the engine being used by this UIManager.
 *
 * @method
 *
 * @return {Engine} The engine used by the UIManager.
 */
UIManager.prototype.getEngine = function getEngine() {
    return this._renderLoop;
};

/**
 * Update method being invoked by the Engine on every `requestAnimationFrame`.
 * Used for updating the notion of time within the managed thread by sending
 * a FRAME command and sending messages to
 *
 * @method
 *
 * @param  {Number} time unix timestamp to be passed down to the worker as a
 * FRAME command
 * @return {undefined} undefined
 */
UIManager.prototype.update = function update (time) {
    this._thread.postMessage(['FRAME', time]);
    var threadMessages = this._compositor.drawCommands();
    this._thread.postMessage(threadMessages);
    this._compositor.clearCommands();
};

module.exports = UIManager;

},{}],35:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var css = '.famous-dom-renderer {' +
    'width:100%;' +
    'height:100%;' +
    'transform-style:preserve-3d;' +
    '-webkit-transform-style:preserve-3d;' +
'}' +

'.famous-dom-element {' +
    '-webkit-transform-origin:0% 0%;' +
    'transform-origin:0% 0%;' +
    '-webkit-backface-visibility:visible;' +
    'backface-visibility:visible;' +
    '-webkit-transform-style:preserve-3d;' +
    'transform-style:preserve-3d;' +
    '-webkit-tap-highlight-color:transparent;' +
    'pointer-events:auto;' +
    'z-index:1;' +
'}' +

'.famous-dom-element-content,' +
'.famous-dom-element {' +
    'position:absolute;' +
    'box-sizing:border-box;' +
    '-moz-box-sizing:border-box;' +
    '-webkit-box-sizing:border-box;' +
'}' +

'.famous-webgl-renderer {' +
    '-webkit-transform: translateZ(1000000px);' +  /* TODO: Fix when Safari Fixes*/
    'transform: translateZ(1000000px)' +
    'pointer-events:none;' +
    'position:absolute;' +
    'z-index:1;' +
    'top:0;' +
    'left:0;' +
'}';

var INJECTED = typeof document === 'undefined';

function injectCSS() {
    if (INJECTED) return;
    INJECTED = true;
    if (document.createStyleSheet) {
        var sheet = document.createStyleSheet();
        sheet.cssText = css;
    }
    else {
        var head = document.getElementsByTagName('head')[0];
        var style = document.createElement('style');

        if (style.styleSheet) {
            style.styleSheet.cssText = css;
        }
        else {
            style.appendChild(document.createTextNode(css));
        }

        (head ? head : document.documentElement).appendChild(style);
    }
}

module.exports = injectCSS;

},{}],36:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * A lightweight, featureless EventEmitter.
 *
 * @class CallbackStore
 * @constructor
 */
function CallbackStore () {
    this._events = {};
}

/**
 * Adds a listener for the specified event (= key).
 *
 * @method on
 * @chainable
 *
 * @param  {String}   key       The event type (e.g. `click`).
 * @param  {Function} callback  A callback function to be invoked whenever `key`
 *                              event is being triggered.
 * @return {Function} destroy   A function to call if you want to remove the
 *                              callback.
 */
CallbackStore.prototype.on = function on (key, callback) {
    if (!this._events[key]) this._events[key] = [];
    var callbackList = this._events[key];
    callbackList.push(callback);
    return function () {
        callbackList.splice(callbackList.indexOf(callback), 1);
    };
};

/**
 * Removes a previously added event listener.
 *
 * @method off
 * @chainable
 *
 * @param  {String} key         The event type from which the callback function
 *                              should be removed.
 * @param  {Function} callback  The callback function to be removed from the
 *                              listeners for key.
 * @return {CallbackStore} this
 */
CallbackStore.prototype.off = function off (key, callback) {
    var events = this._events[key];
    if (events) events.splice(events.indexOf(callback), 1);
    return this;
};

/**
 * Invokes all the previously for this key registered callbacks.
 *
 * @method trigger
 * @chainable
 *
 * @param  {String}        key      The event type.
 * @param  {Object}        payload  The event payload (event object).
 * @return {CallbackStore} this
 */
CallbackStore.prototype.trigger = function trigger (key, payload) {
    var events = this._events[key];
    if (events) {
        var i = 0;
        var len = events.length;
        for (; i < len ; i++) events[i](payload);
    }
    return this;
};

module.exports = CallbackStore;

},{}],37:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * Deep clone an object.
 *
 * @method  clone
 *
 * @param {Object} b       Object to be cloned.
 * @return {Object} a      Cloned object (deep equality).
 */
var clone = function clone(b) {
    var a;
    if (typeof b === 'object') {
        a = (b instanceof Array) ? [] : {};
        for (var key in b) {
            if (typeof b[key] === 'object' && b[key] !== null) {
                if (b[key] instanceof Array) {
                    a[key] = new Array(b[key].length);
                    for (var i = 0; i < b[key].length; i++) {
                        a[key][i] = clone(b[key][i]);
                    }
                }
                else {
                  a[key] = clone(b[key]);
                }
            }
            else {
                a[key] = b[key];
            }
        }
    }
    else {
        a = b;
    }
    return a;
};

module.exports = clone;

},{}],38:[function(require,module,exports){
'use strict';

/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Takes an object containing keys and values and returns an object
 * comprising two "associate" arrays, one with the keys and the other
 * with the values.
 *
 * @method keyValuesToArrays
 *
 * @param {Object} obj                      Objects where to extract keys and values
 *                                          from.
 * @return {Object}         result
 *         {Array.<String>} result.keys     Keys of `result`, as returned by
 *                                          `Object.keys()`
 *         {Array}          result.values   Values of passed in object.
 */
module.exports = function keyValuesToArrays(obj) {
    var keysArray = [], valuesArray = [];
    var i = 0;
    for(var key in obj) {
        if (obj.hasOwnProperty(key)) {
            keysArray[i] = key;
            valuesArray[i] = obj[key];
            i++;
        }
    }
    return {
        keys: keysArray,
        values: valuesArray
    };
};

},{}],39:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var PREFIXES = ['', '-ms-', '-webkit-', '-moz-', '-o-'];

/**
 * A helper function used for determining the vendor prefixed version of the
 * passed in CSS property.
 *
 * Vendor checks are being conducted in the following order:
 *
 * 1. (no prefix)
 * 2. `-mz-`
 * 3. `-webkit-`
 * 4. `-moz-`
 * 5. `-o-`
 *
 * @method vendorPrefix
 *
 * @param {String} property     CSS property (no camelCase), e.g.
 *                              `border-radius`.
 * @return {String} prefixed    Vendor prefixed version of passed in CSS
 *                              property (e.g. `-webkit-border-radius`).
 */
function vendorPrefix(property) {
    for (var i = 0; i < PREFIXES.length; i++) {
        var prefixed = PREFIXES[i] + property;
        if (document.documentElement.style[prefixed] === '') {
            return prefixed;
        }
    }
    return property;
}

module.exports = vendorPrefix;

},{}],40:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var GeometryIds = 0;

/**
 * Geometry is a component that defines and manages data
 * (vertex data and attributes) that is used to draw to WebGL.
 *
 * @class Geometry
 * @constructor
 *
 * @param {Object} options instantiation options
 * @return {undefined} undefined
 */
function Geometry(options) {
    this.options = options || {};
    this.DEFAULT_BUFFER_SIZE = 3;

    this.spec = {
        id: GeometryIds++,
        dynamic: false,
        type: this.options.type || 'TRIANGLES',
        bufferNames: [],
        bufferValues: [],
        bufferSpacings: [],
        invalidations: []
    };

    if (this.options.buffers) {
        var len = this.options.buffers.length;
        for (var i = 0; i < len;) {
            this.spec.bufferNames.push(this.options.buffers[i].name);
            this.spec.bufferValues.push(this.options.buffers[i].data);
            this.spec.bufferSpacings.push(this.options.buffers[i].size || this.DEFAULT_BUFFER_SIZE);
            this.spec.invalidations.push(i++);
        }
    }
}

module.exports = Geometry;

},{}],41:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var Vec3 = require('../math/Vec3');
var Vec2 = require('../math/Vec2');

var outputs = [
    new Vec3(),
    new Vec3(),
    new Vec3(),
    new Vec2(),
    new Vec2()
];

/**
 * A helper object used to calculate buffers for complicated geometries.
 * Tailored for the WebGLRenderer, used by most primitives.
 *
 * @static
 * @class GeometryHelper
 * @return {undefined} undefined
 */
var GeometryHelper = {};

/**
 * A function that iterates through vertical and horizontal slices
 * based on input detail, and generates vertices and indices for each
 * subdivision.
 *
 * @static
 * @method
 *
 * @param  {Number} detailX Amount of slices to iterate through.
 * @param  {Number} detailY Amount of stacks to iterate through.
 * @param  {Function} func Function used to generate vertex positions at each point.
 * @param  {Boolean} wrap Optional parameter (default: Pi) for setting a custom wrap range
 *
 * @return {Object} Object containing generated vertices and indices.
 */
GeometryHelper.generateParametric = function generateParametric(detailX, detailY, func, wrap) {
    var vertices = [];
    var i;
    var theta;
    var phi;
    var j;

    // We can wrap around slightly more than once for uv coordinates to look correct.

    var Xrange = wrap ? Math.PI + (Math.PI / (detailX - 1)) : Math.PI;
    var out = [];

    for (i = 0; i < detailX + 1; i++) {
        theta = i * Xrange / detailX;
        for (j = 0; j < detailY; j++) {
            phi = j * 2.0 * Xrange / detailY;
            func(theta, phi, out);
            vertices.push(out[0], out[1], out[2]);
        }
    }

    var indices = [],
        v = 0,
        next;
    for (i = 0; i < detailX; i++) {
        for (j = 0; j < detailY; j++) {
            next = (j + 1) % detailY;
            indices.push(v + j, v + j + detailY, v + next);
            indices.push(v + next, v + j + detailY, v + next + detailY);
        }
        v += detailY;
    }

    return {
        vertices: vertices,
        indices: indices
    };
};

/**
 * Calculates normals belonging to each face of a geometry.
 * Assumes clockwise declaration of vertices.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry.
 * @param {Array} indices Indices declaring faces of geometry.
 * @param {Array} out Array to be filled and returned.
 *
 * @return {Array} Calculated face normals.
 */
GeometryHelper.computeNormals = function computeNormals(vertices, indices, out) {
    var normals = out || [];
    var indexOne;
    var indexTwo;
    var indexThree;
    var normal;
    var j;
    var len = indices.length / 3;
    var i;
    var x;
    var y;
    var z;
    var length;

    for (i = 0; i < len; i++) {
        indexTwo = indices[i*3 + 0] * 3;
        indexOne = indices[i*3 + 1] * 3;
        indexThree = indices[i*3 + 2] * 3;

        outputs[0].set(vertices[indexOne], vertices[indexOne + 1], vertices[indexOne + 2]);
        outputs[1].set(vertices[indexTwo], vertices[indexTwo + 1], vertices[indexTwo + 2]);
        outputs[2].set(vertices[indexThree], vertices[indexThree + 1], vertices[indexThree + 2]);

        normal = outputs[2].subtract(outputs[0]).cross(outputs[1].subtract(outputs[0])).normalize();

        normals[indexOne + 0] = (normals[indexOne + 0] || 0) + normal.x;
        normals[indexOne + 1] = (normals[indexOne + 1] || 0) + normal.y;
        normals[indexOne + 2] = (normals[indexOne + 2] || 0) + normal.z;

        normals[indexTwo + 0] = (normals[indexTwo + 0] || 0) + normal.x;
        normals[indexTwo + 1] = (normals[indexTwo + 1] || 0) + normal.y;
        normals[indexTwo + 2] = (normals[indexTwo + 2] || 0) + normal.z;

        normals[indexThree + 0] = (normals[indexThree + 0] || 0) + normal.x;
        normals[indexThree + 1] = (normals[indexThree + 1] || 0) + normal.y;
        normals[indexThree + 2] = (normals[indexThree + 2] || 0) + normal.z;
    }

    for (i = 0; i < normals.length; i += 3) {
        x = normals[i];
        y = normals[i+1];
        z = normals[i+2];
        length = Math.sqrt(x * x + y * y + z * z);
        for(j = 0; j< 3; j++) {
            normals[i+j] /= length;
        }
    }

    return normals;
};

/**
 * Divides all inserted triangles into four sub-triangles. Alters the
 * passed in arrays.
 *
 * @static
 * @method
 *
 * @param {Array} indices Indices declaring faces of geometry
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} textureCoords Texture coordinates of all points on the geometry
 * @return {undefined} undefined
 */
GeometryHelper.subdivide = function subdivide(indices, vertices, textureCoords) {
    var triangleIndex = indices.length / 3;
    var face;
    var i;
    var j;
    var k;
    var pos;
    var tex;

    while (triangleIndex--) {
        face = indices.slice(triangleIndex * 3, triangleIndex * 3 + 3);

        pos = face.map(function(vertIndex) {
            return new Vec3(vertices[vertIndex * 3], vertices[vertIndex * 3 + 1], vertices[vertIndex * 3 + 2]);
        });
        vertices.push.apply(vertices, Vec3.scale(Vec3.add(pos[0], pos[1], outputs[0]), 0.5, outputs[1]).toArray());
        vertices.push.apply(vertices, Vec3.scale(Vec3.add(pos[1], pos[2], outputs[0]), 0.5, outputs[1]).toArray());
        vertices.push.apply(vertices, Vec3.scale(Vec3.add(pos[0], pos[2], outputs[0]), 0.5, outputs[1]).toArray());

        if (textureCoords) {
            tex = face.map(function(vertIndex) {
                return new Vec2(textureCoords[vertIndex * 2], textureCoords[vertIndex * 2 + 1]);
            });
            textureCoords.push.apply(textureCoords, Vec2.scale(Vec2.add(tex[0], tex[1], outputs[3]), 0.5, outputs[4]).toArray());
            textureCoords.push.apply(textureCoords, Vec2.scale(Vec2.add(tex[1], tex[2], outputs[3]), 0.5, outputs[4]).toArray());
            textureCoords.push.apply(textureCoords, Vec2.scale(Vec2.add(tex[0], tex[2], outputs[3]), 0.5, outputs[4]).toArray());
        }

        i = vertices.length - 3;
        j = i + 1;
        k = i + 2;

        indices.push(i, j, k);
        indices.push(face[0], i, k);
        indices.push(i, face[1], j);
        indices[triangleIndex] = k;
        indices[triangleIndex + 1] = j;
        indices[triangleIndex + 2] = face[2];
    }
};

/**
 * Creates duplicate of vertices that are shared between faces.
 * Alters the input vertex and index arrays.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} indices Indices declaring faces of geometry
 * @return {undefined} undefined
 */
GeometryHelper.getUniqueFaces = function getUniqueFaces(vertices, indices) {
    var triangleIndex = indices.length / 3,
        registered = [],
        index;

    while (triangleIndex--) {
        for (var i = 0; i < 3; i++) {

            index = indices[triangleIndex * 3 + i];

            if (registered[index]) {
                vertices.push(vertices[index * 3], vertices[index * 3 + 1], vertices[index * 3 + 2]);
                indices[triangleIndex * 3 + i] = vertices.length / 3 - 1;
            }
            else {
                registered[index] = true;
            }
        }
    }
};

/**
 * Divides all inserted triangles into four sub-triangles while maintaining
 * a radius of one. Alters the passed in arrays.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} indices Indices declaring faces of geometry
 * @return {undefined} undefined
 */
GeometryHelper.subdivideSpheroid = function subdivideSpheroid(vertices, indices) {
    var triangleIndex = indices.length / 3,
        abc,
        face,
        i, j, k;

    while (triangleIndex--) {
        face = indices.slice(triangleIndex * 3, triangleIndex * 3 + 3);
        abc = face.map(function(vertIndex) {
            return new Vec3(vertices[vertIndex * 3], vertices[vertIndex * 3 + 1], vertices[vertIndex * 3 + 2]);
        });

        vertices.push.apply(vertices, Vec3.normalize(Vec3.add(abc[0], abc[1], outputs[0]), outputs[1]).toArray());
        vertices.push.apply(vertices, Vec3.normalize(Vec3.add(abc[1], abc[2], outputs[0]), outputs[1]).toArray());
        vertices.push.apply(vertices, Vec3.normalize(Vec3.add(abc[0], abc[2], outputs[0]), outputs[1]).toArray());

        i = vertices.length / 3 - 3;
        j = i + 1;
        k = i + 2;

        indices.push(i, j, k);
        indices.push(face[0], i, k);
        indices.push(i, face[1], j);
        indices[triangleIndex * 3] = k;
        indices[triangleIndex * 3 + 1] = j;
        indices[triangleIndex * 3 + 2] = face[2];
    }
};

/**
 * Divides all inserted triangles into four sub-triangles while maintaining
 * a radius of one. Alters the passed in arrays.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} out Optional array to be filled with resulting normals.
 *
 * @return {Array} New list of calculated normals.
 */
GeometryHelper.getSpheroidNormals = function getSpheroidNormals(vertices, out) {
    out = out || [];
    var length = vertices.length / 3;
    var normalized;

    for (var i = 0; i < length; i++) {
        normalized = new Vec3(
            vertices[i * 3 + 0],
            vertices[i * 3 + 1],
            vertices[i * 3 + 2]
        ).normalize().toArray();

        out[i * 3 + 0] = normalized[0];
        out[i * 3 + 1] = normalized[1];
        out[i * 3 + 2] = normalized[2];
    }

    return out;
};

/**
 * Calculates texture coordinates for spheroid primitives based on
 * input vertices.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} out Optional array to be filled with resulting texture coordinates.
 *
 * @return {Array} New list of calculated texture coordinates
 */
GeometryHelper.getSpheroidUV = function getSpheroidUV(vertices, out) {
    out = out || [];
    var length = vertices.length / 3;
    var vertex;

    var uv = [];

    for(var i = 0; i < length; i++) {
        vertex = outputs[0].set(
            vertices[i * 3],
            vertices[i * 3 + 1],
            vertices[i * 3 + 2]
        )
        .normalize()
        .toArray();

        uv[0] = this.getAzimuth(vertex) * 0.5 / Math.PI + 0.5;
        uv[1] = this.getAltitude(vertex) / Math.PI + 0.5;

        out.push.apply(out, uv);
    }

    return out;
};

/**
 * Iterates through and normalizes a list of vertices.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} out Optional array to be filled with resulting normalized vectors.
 *
 * @return {Array} New list of normalized vertices
 */
GeometryHelper.normalizeAll = function normalizeAll(vertices, out) {
    out = out || [];
    var len = vertices.length / 3;

    for (var i = 0; i < len; i++) {
        Array.prototype.push.apply(out, new Vec3(vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]).normalize().toArray());
    }

    return out;
};

/**
 * Normalizes a set of vertices to model space.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} out Optional array to be filled with model space position vectors.
 *
 * @return {Array} Output vertices.
 */
GeometryHelper.normalizeVertices = function normalizeVertices(vertices, out) {
    out = out || [];
    var len = vertices.length / 3;
    var vectors = [];
    var minX;
    var maxX;
    var minY;
    var maxY;
    var minZ;
    var maxZ;
    var v;
    var i;

    for (i = 0; i < len; i++) {
        v = vectors[i] = new Vec3(
            vertices[i * 3],
            vertices[i * 3 + 1],
            vertices[i * 3 + 2]
        );

        if (minX == null || v.x < minX) minX = v.x;
        if (maxX == null || v.x > maxX) maxX = v.x;

        if (minY == null || v.y < minY) minY = v.y;
        if (maxY == null || v.y > maxY) maxY = v.y;

        if (minZ == null || v.z < minZ) minZ = v.z;
        if (maxZ == null || v.z > maxZ) maxZ = v.z;
    }

    var translation = new Vec3(
        getTranslationFactor(maxX, minX),
        getTranslationFactor(maxY, minY),
        getTranslationFactor(maxZ, minZ)
    );

    var scale = Math.min(
        getScaleFactor(maxX + translation.x, minX + translation.x),
        getScaleFactor(maxY + translation.y, minY + translation.y),
        getScaleFactor(maxZ + translation.z, minZ + translation.z)
    );

    for (i = 0; i < vectors.length; i++) {
        out.push.apply(out, vectors[i].add(translation).scale(scale).toArray());
    }

    return out;
};

/**
 * Determines translation amount for a given axis to normalize model coordinates.
 *
 * @method
 * @private
 *
 * @param {Number} max Maximum position value of given axis on the model.
 * @param {Number} min Minimum position value of given axis on the model.
 *
 * @return {Number} Number by which the given axis should be translated for all vertices.
 */
function getTranslationFactor(max, min) {
    return -(min + (max - min) / 2);
}

/**
 * Determines scale amount for a given axis to normalize model coordinates.
 *
 * @method
 * @private
 *
 * @param {Number} max Maximum scale value of given axis on the model.
 * @param {Number} min Minimum scale value of given axis on the model.
 *
 * @return {Number} Number by which the given axis should be scaled for all vertices.
 */
function getScaleFactor(max, min) {
    return 1 / ((max - min) / 2);
}

/**
 * Finds the azimuth, or angle above the XY plane, of a given vector.
 *
 * @static
 * @method
 *
 * @param {Array} v Vertex to retreive azimuth from.
 *
 * @return {Number} Azimuth value in radians.
 */
GeometryHelper.getAzimuth = function azimuth(v) {
    return Math.atan2(v[2], -v[0]);
};

/**
 * Finds the altitude, or angle above the XZ plane, of a given vector.
 *
 * @static
 * @method
 *
 * @param {Array} v Vertex to retreive altitude from.
 *
 * @return {Number} Altitude value in radians.
 */
GeometryHelper.getAltitude = function altitude(v) {
    return Math.atan2(-v[1], Math.sqrt((v[0] * v[0]) + (v[2] * v[2])));
};

/**
 * Converts a list of indices from 'triangle' to 'line' format.
 *
 * @static
 * @method
 *
 * @param {Array} indices Indices of all faces on the geometry
 * @param {Array} out Indices of all faces on the geometry
 *
 * @return {Array} New list of line-formatted indices
 */
GeometryHelper.trianglesToLines = function triangleToLines(indices, out) {
    var numVectors = indices.length / 3;
    out = out || [];
    var i;

    for (i = 0; i < numVectors; i++) {
        out.push(indices[i * 3 + 0], indices[i * 3 + 1]);
        out.push(indices[i * 3 + 1], indices[i * 3 + 2]);
        out.push(indices[i * 3 + 2], indices[i * 3 + 0]);
    }

    return out;
};

/**
 * Adds a reverse order triangle for every triangle in the mesh. Adds extra vertices
 * and indices to input arrays.
 *
 * @static
 * @method
 *
 * @param {Array} vertices X, Y, Z positions of all vertices in the geometry
 * @param {Array} indices Indices of all faces on the geometry
 * @return {undefined} undefined
 */
GeometryHelper.addBackfaceTriangles = function addBackfaceTriangles(vertices, indices) {
    var nFaces = indices.length / 3;

    var maxIndex = 0;
    var i = indices.length;
    while (i--) if (indices[i] > maxIndex) maxIndex = indices[i];

    maxIndex++;

    for (i = 0; i < nFaces; i++) {
        var indexOne = indices[i * 3],
            indexTwo = indices[i * 3 + 1],
            indexThree = indices[i * 3 + 2];

        indices.push(indexOne + maxIndex, indexThree + maxIndex, indexTwo + maxIndex);
    }

    // Iterating instead of .slice() here to avoid max call stack issue.

    var nVerts = vertices.length;
    for (i = 0; i < nVerts; i++) {
        vertices.push(vertices[i]);
    }
};

module.exports = GeometryHelper;

},{"../math/Vec2":25,"../math/Vec3":26}],42:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var Geometry = require('../Geometry');
var GeometryHelper = require('../GeometryHelper');

/**
 * This function returns a new static geometry, which is passed
 * custom buffer data.
 *
 * @class Plane
 * @constructor
 *
 * @param {Object} options Parameters that alter the
 * vertex buffers of the generated geometry.
 *
 * @return {Object} constructed geometry
 */
function Plane(options) {
    options = options || {};
    var detailX = options.detailX || options.detail || 1;
    var detailY = options.detailY || options.detail || 1;

    var vertices      = [];
    var textureCoords = [];
    var normals       = [];
    var indices       = [];

    var i;

    for (var y = 0; y <= detailY; y++) {
        var t = y / detailY;
        for (var x = 0; x <= detailX; x++) {
            var s = x / detailX;
            vertices.push(2. * (s - .5), 2 * (t - .5), 0);
            textureCoords.push(s, 1 - t);
            if (x < detailX && y < detailY) {
                i = x + y * (detailX + 1);
                indices.push(i, i + 1, i + detailX + 1);
                indices.push(i + detailX + 1, i + 1, i + detailX + 2);
            }
        }
    }

    if (options.backface !== false) {
        GeometryHelper.addBackfaceTriangles(vertices, indices);

        // duplicate texture coordinates as well

        var len = textureCoords.length;
        for (i = 0; i < len; i++) textureCoords.push(textureCoords[i]);
    }

    normals = GeometryHelper.computeNormals(vertices, indices);

    return new Geometry({
        buffers: [
            { name: 'a_pos', data: vertices },
            { name: 'a_texCoord', data: textureCoords, size: 2 },
            { name: 'a_normals', data: normals },
            { name: 'indices', data: indices, size: 1 }
        ]
    });
}

module.exports = Plane;

},{"../Geometry":40,"../GeometryHelper":41}],43:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * Buffer is a private class that wraps the vertex data that defines
 * the the points of the triangles that webgl draws. Each buffer
 * maps to one attribute of a mesh.
 *
 * @class Buffer
 * @constructor
 *
 * @param {Number} target The bind target of the buffer to update: ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER
 * @param {Object} type Array type to be used in calls to gl.bufferData.
 * @param {WebGLContext} gl The WebGL context that the buffer is hosted by.
 *
 * @return {undefined} undefined
 */
function Buffer(target, type, gl) {
    this.buffer = null;
    this.target = target;
    this.type = type;
    this.data = [];
    this.gl = gl;
}

/**
 * Creates a WebGL buffer if one does not yet exist and binds the buffer to
 * to the context. Runs bufferData with appropriate data.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Buffer.prototype.subData = function subData() {
    var gl = this.gl;
    var data = [];

    // to prevent against maximum call-stack issue.
    for (var i = 0, chunk = 10000; i < this.data.length; i += chunk)
        data = Array.prototype.concat.apply(data, this.data.slice(i, i + chunk));

    this.buffer = this.buffer || gl.createBuffer();
    gl.bindBuffer(this.target, this.buffer);
    gl.bufferData(this.target, new this.type(data), gl.STATIC_DRAW);
};

module.exports = Buffer;

},{}],44:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var INDICES = 'indices';

var Buffer = require('./Buffer');

/**
 * BufferRegistry is a class that manages allocation of buffers to
 * input geometries.
 *
 * @class BufferRegistry
 * @constructor
 *
 * @param {WebGLContext} context WebGL drawing context to be passed to buffers.
 *
 * @return {undefined} undefined
 */
function BufferRegistry(context) {
    this.gl = context;

    this.registry = {};
    this._dynamicBuffers = [];
    this._staticBuffers = [];

    this._arrayBufferMax = 30000;
    this._elementBufferMax = 30000;
}

/**
 * Binds and fills all the vertex data into webgl buffers.  Will reuse buffers if
 * possible.  Populates registry with the name of the buffer, the WebGL buffer
 * object, spacing of the attribute, the attribute's offset within the buffer,
 * and finally the length of the buffer.  This information is later accessed by
 * the root to draw the buffers.
 *
 * @method
 *
 * @param {Number} geometryId Id of the geometry instance that holds the buffers.
 * @param {String} name Key of the input buffer in the geometry.
 * @param {Array} value Flat array containing input data for buffer.
 * @param {Number} spacing The spacing, or itemSize, of the input buffer.
 * @param {Boolean} dynamic Boolean denoting whether a geometry is dynamic or static.
 *
 * @return {undefined} undefined
 */
BufferRegistry.prototype.allocate = function allocate(geometryId, name, value, spacing, dynamic) {
    var vertexBuffers = this.registry[geometryId] || (this.registry[geometryId] = { keys: [], values: [], spacing: [], offset: [], length: [] });

    var j = vertexBuffers.keys.indexOf(name);
    var isIndex = name === INDICES;
    var bufferFound = false;
    var newOffset;
    var offset = 0;
    var length;
    var buffer;
    var k;

    if (j === -1) {
        j = vertexBuffers.keys.length;
        length = isIndex ? value.length : Math.floor(value.length / spacing);

        if (!dynamic) {

            // Use a previously created buffer if available.

            for (k = 0; k < this._staticBuffers.length; k++) {

                if (isIndex === this._staticBuffers[k].isIndex) {
                    newOffset = this._staticBuffers[k].offset + value.length;
                    if ((!isIndex && newOffset < this._arrayBufferMax) || (isIndex && newOffset < this._elementBufferMax)) {
                        buffer = this._staticBuffers[k].buffer;
                        offset = this._staticBuffers[k].offset;
                        this._staticBuffers[k].offset += value.length;
                        bufferFound = true;
                        break;
                    }
                }
            }

            // Create a new static buffer in none were found.

            if (!bufferFound) {
                buffer = new Buffer(
                    isIndex ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER,
                    isIndex ? Uint16Array : Float32Array,
                    this.gl
                );

                this._staticBuffers.push({ buffer: buffer, offset: value.length, isIndex: isIndex });
            }
        }
        else {

            // For dynamic geometries, always create new buffer.

            buffer = new Buffer(
                isIndex ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER,
                isIndex ? Uint16Array : Float32Array,
                this.gl
            );

            this._dynamicBuffers.push({ buffer: buffer, offset: value.length, isIndex: isIndex });
        }

        // Update the registry for the spec with buffer information.

        vertexBuffers.keys.push(name);
        vertexBuffers.values.push(buffer);
        vertexBuffers.spacing.push(spacing);
        vertexBuffers.offset.push(offset);
        vertexBuffers.length.push(length);
    }

    var len = value.length;
    for (k = 0; k < len; k++) {
        vertexBuffers.values[j].data[offset + k] = value[k];
    }
    vertexBuffers.values[j].subData();
};

module.exports = BufferRegistry;

},{"./Buffer":43}],45:[function(require,module,exports){
'use strict';

/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Takes the original rendering contexts' compiler function
 * and augments it with added functionality for parsing and
 * displaying errors.
 *
 * @method
 *
 * @returns {Function} Augmented function
 */
module.exports = function Debug() {
    return _augmentFunction(
        this.gl.compileShader,
        function(shader) {
            if (!this.getShaderParameter(shader, this.COMPILE_STATUS)) {
                var errors = this.getShaderInfoLog(shader);
                var source = this.getShaderSource(shader);
                _processErrors(errors, source);
            }
        }
    );
};

// Takes a function, keeps the reference and replaces it by a closure that
// executes the original function and the provided callback.
function _augmentFunction(func, callback) {
    return function() {
        var res = func.apply(this, arguments);
        callback.apply(this, arguments);
        return res;
    };
}

// Parses errors and failed source code from shaders in order
// to build displayable error blocks.
// Inspired by Jaume Sanchez Elias.
function _processErrors(errors, source) {

    var css = 'body,html{background:#e3e3e3;font-family:monaco,monospace;font-size:14px;line-height:1.7em}' +
              '#shaderReport{left:0;top:0;right:0;box-sizing:border-box;position:absolute;z-index:1000;color:' +
              '#222;padding:15px;white-space:normal;list-style-type:none;margin:50px auto;max-width:1200px}' +
              '#shaderReport li{background-color:#fff;margin:13px 0;box-shadow:0 1px 2px rgba(0,0,0,.15);' +
              'padding:20px 30px;border-radius:2px;border-left:20px solid #e01111}span{color:#e01111;' +
              'text-decoration:underline;font-weight:700}#shaderReport li p{padding:0;margin:0}' +
              '#shaderReport li:nth-child(even){background-color:#f4f4f4}' +
              '#shaderReport li p:first-child{margin-bottom:10px;color:#666}';

    var el = document.createElement('style');
    document.getElementsByTagName('head')[0].appendChild(el);
    el.textContent = css;

    var report = document.createElement('ul');
    report.setAttribute('id', 'shaderReport');
    document.body.appendChild(report);

    var re = /ERROR: [\d]+:([\d]+): (.+)/gmi;
    var lines = source.split('\n');

    var m;
    while ((m = re.exec(errors)) != null) {
        if (m.index === re.lastIndex) re.lastIndex++;
        var li = document.createElement('li');
        var code = '<p><span>ERROR</span> "' + m[2] + '" in line ' + m[1] + '</p>';
        code += '<p><b>' + lines[m[1] - 1].replace(/^[ \t]+/g, '') + '</b></p>';
        li.innerHTML = code;
        report.appendChild(li);
    }
}

},{}],46:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var clone = require('../utilities/clone');
var keyValueToArrays = require('../utilities/keyValueToArrays');

var vertexWrapper = require('../webgl-shaders').vertex;
var fragmentWrapper = require('../webgl-shaders').fragment;
var Debug = require('./Debug');

var VERTEX_SHADER = 35633;
var FRAGMENT_SHADER = 35632;
var identityMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

var header = 'precision mediump float;\n';

var TYPES = {
    undefined: 'float ',
    1: 'float ',
    2: 'vec2 ',
    3: 'vec3 ',
    4: 'vec4 ',
    16: 'mat4 '
};

var inputTypes = {
    u_baseColor: 'vec4',
    u_normals: 'vert',
    u_glossiness: 'vec4',
    u_positionOffset: 'vert'
};

var masks =  {
    vert: 1,
    vec3: 2,
    vec4: 4,
    float: 8
};

/**
 * Uniform keys and values
 */
var uniforms = keyValueToArrays({
    u_perspective: identityMatrix,
    u_view: identityMatrix,
    u_resolution: [0, 0, 0],
    u_transform: identityMatrix,
    u_size: [1, 1, 1],
    u_time: 0,
    u_opacity: 1,
    u_metalness: 0,
    u_glossiness: [0, 0, 0, 0],
    u_baseColor: [1, 1, 1, 1],
    u_normals: [1, 1, 1],
    u_positionOffset: [0, 0, 0],
    u_lightPosition: identityMatrix,
    u_lightColor: identityMatrix,
    u_ambientLight: [0, 0, 0],
    u_flatShading: 0,
    u_numLights: 0
});

/**
 * Attributes keys and values
 */
var attributes = keyValueToArrays({
    a_pos: [0, 0, 0],
    a_texCoord: [0, 0],
    a_normals: [0, 0, 0]
});

/**
 * Varyings keys and values
 */
var varyings = keyValueToArrays({
    v_textureCoordinate: [0, 0],
    v_normal: [0, 0, 0],
    v_position: [0, 0, 0],
    v_eyeVector: [0, 0, 0]
});

/**
 * A class that handles interactions with the WebGL shader program
 * used by a specific context.  It manages creation of the shader program
 * and the attached vertex and fragment shaders.  It is also in charge of
 * passing all uniforms to the WebGLContext.
 *
 * @class Program
 * @constructor
 *
 * @param {WebGL_Context} gl Context to be used to create the shader program
 * @param {Object} options Program options
 *
 * @return {undefined} undefined
 */
function Program(gl, options) {
    this.gl = gl;
    this.textureSlots = 1;
    this.options = options || {};

    this.registeredMaterials = {};
    this.flaggedUniforms = [];
    this.cachedUniforms  = {};
    this.uniformTypes = [];

    this.definitionVec4 = [];
    this.definitionVec3 = [];
    this.definitionFloat = [];
    this.applicationVec3 = [];
    this.applicationVec4 = [];
    this.applicationFloat = [];
    this.applicationVert = [];
    this.definitionVert = [];

    this.resetProgram();
}

/**
 * Determines whether a material has already been registered to
 * the shader program.
 *
 * @method
 *
 * @param {String} name Name of target input of material.
 * @param {Object} material Compiled material object being verified.
 *
 * @return {Program} this Current program.
 */
Program.prototype.registerMaterial = function registerMaterial(name, material) {
    var compiled = material;
    var type = inputTypes[name];
    var mask = masks[type];

    if ((this.registeredMaterials[material._id] & mask) === mask) return this;

    var k;

    for (k in compiled.uniforms) {
        if (uniforms.keys.indexOf(k) === -1) {
            uniforms.keys.push(k);
            uniforms.values.push(compiled.uniforms[k]);
        }
    }

    for (k in compiled.varyings) {
        if (varyings.keys.indexOf(k) === -1) {
            varyings.keys.push(k);
            varyings.values.push(compiled.varyings[k]);
        }
    }

    for (k in compiled.attributes) {
        if (attributes.keys.indexOf(k) === -1) {
            attributes.keys.push(k);
            attributes.values.push(compiled.attributes[k]);
        }
    }

    this.registeredMaterials[material._id] |= mask;

    if (type === 'float') {
        this.definitionFloat.push(material.defines);
        this.definitionFloat.push('float fa_' + material._id + '() {\n '  + compiled.glsl + ' \n}');
        this.applicationFloat.push('if (int(abs(ID)) == ' + material._id + ') return fa_' + material._id  + '();');
    }

    if (type === 'vec3') {
        this.definitionVec3.push(material.defines);
        this.definitionVec3.push('vec3 fa_' + material._id + '() {\n '  + compiled.glsl + ' \n}');
        this.applicationVec3.push('if (int(abs(ID.x)) == ' + material._id + ') return fa_' + material._id + '();');
    }

    if (type === 'vec4') {
        this.definitionVec4.push(material.defines);
        this.definitionVec4.push('vec4 fa_' + material._id + '() {\n '  + compiled.glsl + ' \n}');
        this.applicationVec4.push('if (int(abs(ID.x)) == ' + material._id + ') return fa_' + material._id + '();');
    }

    if (type === 'vert') {
        this.definitionVert.push(material.defines);
        this.definitionVert.push('vec3 fa_' + material._id + '() {\n '  + compiled.glsl + ' \n}');
        this.applicationVert.push('if (int(abs(ID.x)) == ' + material._id + ') return fa_' + material._id + '();');
    }

    return this.resetProgram();
};

/**
 * Clears all cached uniforms and attribute locations.  Assembles
 * new fragment and vertex shaders and based on material from
 * currently registered materials.  Attaches said shaders to new
 * shader program and upon success links program to the WebGL
 * context.
 *
 * @method
 *
 * @return {Program} Current program.
 */
Program.prototype.resetProgram = function resetProgram() {
    var vertexHeader = [header];
    var fragmentHeader = [header];

    var fragmentSource;
    var vertexSource;
    var program;
    var name;
    var value;
    var i;

    this.uniformLocations   = [];
    this.attributeLocations = {};

    this.uniformTypes = {};

    this.attributeNames = clone(attributes.keys);
    this.attributeValues = clone(attributes.values);

    this.varyingNames = clone(varyings.keys);
    this.varyingValues = clone(varyings.values);

    this.uniformNames = clone(uniforms.keys);
    this.uniformValues = clone(uniforms.values);

    this.flaggedUniforms = [];
    this.cachedUniforms = {};

    fragmentHeader.push('uniform sampler2D u_textures[7];\n');

    if (this.applicationVert.length) {
        vertexHeader.push('uniform sampler2D u_textures[7];\n');
    }

    for(i = 0; i < this.uniformNames.length; i++) {
        name = this.uniformNames[i];
        value = this.uniformValues[i];
        vertexHeader.push('uniform ' + TYPES[value.length] + name + ';\n');
        fragmentHeader.push('uniform ' + TYPES[value.length] + name + ';\n');
    }

    for(i = 0; i < this.attributeNames.length; i++) {
        name = this.attributeNames[i];
        value = this.attributeValues[i];
        vertexHeader.push('attribute ' + TYPES[value.length] + name + ';\n');
    }

    for(i = 0; i < this.varyingNames.length; i++) {
        name = this.varyingNames[i];
        value = this.varyingValues[i];
        vertexHeader.push('varying ' + TYPES[value.length]  + name + ';\n');
        fragmentHeader.push('varying ' + TYPES[value.length] + name + ';\n');
    }

    vertexSource = vertexHeader.join('') + vertexWrapper
        .replace('#vert_definitions', this.definitionVert.join('\n'))
        .replace('#vert_applications', this.applicationVert.join('\n'));

    fragmentSource = fragmentHeader.join('') + fragmentWrapper
        .replace('#vec3_definitions', this.definitionVec3.join('\n'))
        .replace('#vec3_applications', this.applicationVec3.join('\n'))
        .replace('#vec4_definitions', this.definitionVec4.join('\n'))
        .replace('#vec4_applications', this.applicationVec4.join('\n'))
        .replace('#float_definitions', this.definitionFloat.join('\n'))
        .replace('#float_applications', this.applicationFloat.join('\n'));

    program = this.gl.createProgram();

    this.gl.attachShader(
        program,
        this.compileShader(this.gl.createShader(VERTEX_SHADER), vertexSource)
    );

    this.gl.attachShader(
        program,
        this.compileShader(this.gl.createShader(FRAGMENT_SHADER), fragmentSource)
    );

    this.gl.linkProgram(program);

    if (! this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        console.error('link error: ' + this.gl.getProgramInfoLog(program));
        this.program = null;
    }
    else {
        this.program = program;
        this.gl.useProgram(this.program);
    }

    this.setUniforms(this.uniformNames, this.uniformValues);

    var textureLocation = this.gl.getUniformLocation(this.program, 'u_textures[0]');
    this.gl.uniform1iv(textureLocation, [0, 1, 2, 3, 4, 5, 6]);

    return this;
};

/**
 * Compares the value of the input uniform value against
 * the cached value stored on the Program class.  Updates and
 * creates new entries in the cache when necessary.
 *
 * @method
 * @param {String} targetName Key of uniform spec being evaluated.
 * @param {Number|Array} value Value of uniform spec being evaluated.
 *
 * @return {Boolean} boolean Indicating whether the uniform being set is cached.
 */
Program.prototype.uniformIsCached = function(targetName, value) {
    if(this.cachedUniforms[targetName] == null) {
        if (value.length) {
            this.cachedUniforms[targetName] = new Float32Array(value);
        }
        else {
            this.cachedUniforms[targetName] = value;
        }
        return false;
    }
    else if (value.length) {
        var i = value.length;
        while (i--) {
            if(value[i] !== this.cachedUniforms[targetName][i]) {
                i = value.length;
                while(i--) this.cachedUniforms[targetName][i] = value[i];
                return false;
            }
        }
    }

    else if (this.cachedUniforms[targetName] !== value) {
        this.cachedUniforms[targetName] = value;
        return false;
    }

    return true;
};

/**
 * Handles all passing of uniforms to WebGL drawing context.  This
 * function will find the uniform location and then, based on
 * a type inferred from the javascript value of the uniform, it will call
 * the appropriate function to pass the uniform to WebGL.  Finally,
 * setUniforms will iterate through the passed in shaderChunks (if any)
 * and set the appropriate uniforms to specify which chunks to use.
 *
 * @method
 * @param {Array} uniformNames Array containing the keys of all uniforms to be set.
 * @param {Array} uniformValue Array containing the values of all uniforms to be set.
 *
 * @return {Program} Current program.
 */
Program.prototype.setUniforms = function (uniformNames, uniformValue) {
    var gl = this.gl;
    var location;
    var value;
    var name;
    var len;
    var i;

    if (!this.program) return this;

    len = uniformNames.length;
    for (i = 0; i < len; i++) {
        name = uniformNames[i];
        value = uniformValue[i];

        // Retreive the cached location of the uniform,
        // requesting a new location from the WebGL context
        // if it does not yet exist.

        location = this.uniformLocations[name] || gl.getUniformLocation(this.program, name);
        if (!location) continue;

        this.uniformLocations[name] = location;

        // Check if the value is already set for the
        // given uniform.

        if (this.uniformIsCached(name, value)) continue;

        // Determine the correct function and pass the uniform
        // value to WebGL.

        if (!this.uniformTypes[name]) {
            this.uniformTypes[name] = this.getUniformTypeFromValue(value);
        }

        // Call uniform setter function on WebGL context with correct value

        switch (this.uniformTypes[name]) {
            case 'uniform4fv':  gl.uniform4fv(location, value); break;
            case 'uniform3fv':  gl.uniform3fv(location, value); break;
            case 'uniform2fv':  gl.uniform2fv(location, value); break;
            case 'uniform1fv':  gl.uniform1fv(location, value); break;
            case 'uniform1f' :  gl.uniform1f(location, value); break;
            case 'uniformMatrix3fv': gl.uniformMatrix3fv(location, false, value); break;
            case 'uniformMatrix4fv': gl.uniformMatrix4fv(location, false, value); break;
        }
    }

    return this;
};

/**
 * Infers uniform setter function to be called on the WebGL context, based
 * on an input value.
 *
 * @method
 *
 * @param {Number|Array} value Value from which uniform type is inferred.
 *
 * @return {String} Name of uniform function for given value.
 */
Program.prototype.getUniformTypeFromValue = function getUniformTypeFromValue(value) {
    if (Array.isArray(value) || value instanceof Float32Array) {
        switch (value.length) {
            case 1:  return 'uniform1fv';
            case 2:  return 'uniform2fv';
            case 3:  return 'uniform3fv';
            case 4:  return 'uniform4fv';
            case 9:  return 'uniformMatrix3fv';
            case 16: return 'uniformMatrix4fv';
        }
    }
    else if (!isNaN(parseFloat(value)) && isFinite(value)) {
        return 'uniform1f';
    }

    throw 'cant load uniform "' + name + '" with value:' + JSON.stringify(value);
};

/**
 * Adds shader source to shader and compiles the input shader.  Checks
 * compile status and logs error if necessary.
 *
 * @method
 *
 * @param {Object} shader Program to be compiled.
 * @param {String} source Source to be used in the shader.
 *
 * @return {Object} Compiled shader.
 */
Program.prototype.compileShader = function compileShader(shader, source) {
    var i = 1;

    if (this.options.debug) {
        this.gl.compileShader = Debug.call(this);
    }

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        console.error('compile error: ' + this.gl.getShaderInfoLog(shader));
        console.error('1: ' + source.replace(/\n/g, function () {
            return '\n' + (i+=1) + ': ';
        }));
    }

    return shader;
};

module.exports = Program;

},{"../utilities/clone":37,"../utilities/keyValueToArrays":38,"../webgl-shaders":53,"./Debug":45}],47:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * Texture is a private class that stores image data
 * to be accessed from a shader or used as a render target.
 *
 * @class Texture
 * @constructor
 *
 * @param {GL} gl GL
 * @param {Object} options Options
 *
 * @return {undefined} undefined
 */
function Texture(gl, options) {
    options = options || {};
    this.id = gl.createTexture();
    this.width = options.width || 0;
    this.height = options.height || 0;
    this.mipmap = options.mipmap;
    this.format = options.format || 'RGBA';
    this.type = options.type || 'UNSIGNED_BYTE';
    this.gl = gl;

    this.bind();

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[options.magFilter] || gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[options.minFilter] || gl.NEAREST);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[options.wrapS] || gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[options.wrapT] || gl.CLAMP_TO_EDGE);
}

/**
 * Binds this texture as the selected target.
 *
 * @method
 * @return {Object} Current texture instance.
 */
Texture.prototype.bind = function bind() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.id);
    return this;
};

/**
 * Erases the texture data in the given texture slot.
 *
 * @method
 * @return {Object} Current texture instance.
 */
Texture.prototype.unbind = function unbind() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    return this;
};

/**
 * Replaces the image data in the texture with the given image.
 *
 * @method
 *
 * @param {Image}   img     The image object to upload pixel data from.
 * @return {Object}         Current texture instance.
 */
Texture.prototype.setImage = function setImage(img) {
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl[this.format], this.gl[this.format], this.gl[this.type], img);
    if (this.mipmap) this.gl.generateMipmap(this.gl.TEXTURE_2D);
    return this;
};

/**
 * Replaces the image data in the texture with an array of arbitrary data.
 *
 * @method
 *
 * @param {Array}   input   Array to be set as data to texture.
 * @return {Object}         Current texture instance.
 */
Texture.prototype.setArray = function setArray(input) {
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl[this.format], this.width, this.height, 0, this.gl[this.format], this.gl[this.type], input);
    return this;
};

/**
 * Dumps the rgb-pixel contents of a texture into an array for debugging purposes
 *
 * @method
 *
 * @param {Number} x        x-offset between texture coordinates and snapshot
 * @param {Number} y        y-offset between texture coordinates and snapshot
 * @param {Number} width    x-depth of the snapshot
 * @param {Number} height   y-depth of the snapshot
 *
 * @return {Array}          An array of the pixels contained in the snapshot.
 */
Texture.prototype.readBack = function readBack(x, y, width, height) {
    var gl = this.gl;
    var pixels;
    x = x || 0;
    y = y || 0;
    width = width || this.width;
    height = height || this.height;
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
        pixels = new Uint8Array(width * height * 4);
        gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    }
    return pixels;
};

module.exports = Texture;

},{}],48:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
'use strict';

var Texture = require('./Texture');
var createCheckerboard = require('./createCheckerboard');

/**
 * Handles loading, binding, and resampling of textures for WebGLRenderer.
 *
 * @class TextureManager
 * @constructor
 *
 * @param {WebGL_Context} gl Context used to create and bind textures.
 *
 * @return {undefined} undefined
 */
function TextureManager(gl) {
    this.registry = [];
    this._needsResample = [];

    this._activeTexture = 0;
    this._boundTexture = null;

    this._checkerboard = createCheckerboard();

    this.gl = gl;
}

/**
 * Update function used by WebGLRenderer to queue resamples on
 * registered textures.
 *
 * @method
 *
 * @param {Number}      time    Time in milliseconds according to the compositor.
 * @return {undefined}          undefined
 */
TextureManager.prototype.update = function update(time) {
    var registryLength = this.registry.length;

    for (var i = 1; i < registryLength; i++) {
        var texture = this.registry[i];

        if (texture && texture.isLoaded && texture.resampleRate) {
            if (!texture.lastResample || time - texture.lastResample > texture.resampleRate) {
                if (!this._needsResample[texture.id]) {
                    this._needsResample[texture.id] = true;
                    texture.lastResample = time;
                }
            }
        }
    }
};

/**
 * Creates a spec and creates a texture based on given texture data.
 * Handles loading assets if necessary.
 *
 * @method
 *
 * @param {Object}  input   Object containing texture id, texture data
 *                          and options used to draw texture.
 * @param {Number}  slot    Texture slot to bind generated texture to.
 * @return {undefined}      undefined
 */
TextureManager.prototype.register = function register(input, slot) {
    var source = input.data;
    var textureId = input.id;
    var options = input.options || {};
    var texture = this.registry[textureId];
    var spec;

    if (!texture) {

        texture = new Texture(this.gl, options);
        texture.setImage(this._checkerboard);

        // Add texture to registry

        spec = this.registry[textureId] = {
            resampleRate: options.resampleRate || null,
            lastResample: null,
            isLoaded: false,
            texture: texture,
            source: source,
            id: textureId,
            slot: slot
        };

        // Handle array

        if (Array.isArray(source) || source instanceof Uint8Array || source instanceof Float32Array) {
            this.bindTexture(textureId);
            texture.setArray(source);
            spec.isLoaded = true;
        }

        // Handle video

        else if (window && source instanceof window.HTMLVideoElement) {
            source.addEventListener('loadeddata', function() {
                this.bindTexture(textureId);
                texture.setImage(source);

                spec.isLoaded = true;
                spec.source = source;
            }.bind(this));
        }

        // Handle image url

        else if (typeof source === 'string') {
            loadImage(source, function (img) {
                this.bindTexture(textureId);
                texture.setImage(img);

                spec.isLoaded = true;
                spec.source = img;
            }.bind(this));
        }
    }

    return textureId;
};

/**
 * Loads an image from a string or Image object and executes a callback function.
 *
 * @method
 * @private
 *
 * @param {Object|String} input The input image data to load as an asset.
 * @param {Function} callback The callback function to be fired when the image has finished loading.
 *
 * @return {Object} Image object being loaded.
 */
function loadImage (input, callback) {
    var image = (typeof input === 'string' ? new Image() : input) || {};
        image.crossOrigin = 'anonymous';

    if (!image.src) image.src = input;
    if (!image.complete) {
        image.onload = function () {
            callback(image);
        };
    }
    else {
        callback(image);
    }

    return image;
}

/**
 * Sets active texture slot and binds target texture.  Also handles
 * resampling when necessary.
 *
 * @method
 *
 * @param {Number} id Identifier used to retreive texture spec
 *
 * @return {undefined} undefined
 */
TextureManager.prototype.bindTexture = function bindTexture(id) {
    var spec = this.registry[id];

    if (this._activeTexture !== spec.slot) {
        this.gl.activeTexture(this.gl.TEXTURE0 + spec.slot);
        this._activeTexture = spec.slot;
    }

    if (this._boundTexture !== id) {
        this._boundTexture = id;
        spec.texture.bind();
    }

    if (this._needsResample[spec.id]) {

        // TODO: Account for resampling of arrays.

        spec.texture.setImage(spec.source);
        this._needsResample[spec.id] = false;
    }
};

module.exports = TextureManager;

},{"./Texture":47,"./createCheckerboard":51}],49:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var Program = require('./Program');
var BufferRegistry = require('./BufferRegistry');
var Plane = require('../webgl-geometries/primitives/Plane');
var sorter = require('./radixSort');
var keyValueToArrays = require('../utilities/keyValueToArrays');
var TextureManager = require('./TextureManager');
var compileMaterial = require('./compileMaterial');

var identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

var globalUniforms = keyValueToArrays({
    'u_numLights': 0,
    'u_ambientLight': new Array(3),
    'u_lightPosition': new Array(3),
    'u_lightColor': new Array(3),
    'u_perspective': new Array(16),
    'u_time': 0,
    'u_view': new Array(16)
});

/**
 * WebGLRenderer is a private class that manages all interactions with the WebGL
 * API. Each frame it receives commands from the compositor and updates its
 * registries accordingly. Subsequently, the draw function is called and the
 * WebGLRenderer issues draw calls for all meshes in its registry.
 *
 * @class WebGLRenderer
 * @constructor
 *
 * @param {Element} canvas The DOM element that GL will paint itself onto.
 * @param {Compositor} compositor Compositor used for querying the time from.
 *
 * @return {undefined} undefined
 */
function WebGLRenderer(canvas, compositor) {
    canvas.classList.add('famous-webgl-renderer');

    this.canvas = canvas;
    this.compositor = compositor;

    for (var key in this.constructor.DEFAULT_STYLES) {
        this.canvas.style[key] = this.constructor.DEFAULT_STYLES[key];
    }

    var gl = this.gl = this.getWebGLContext(this.canvas);

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.polygonOffset(0.1, 0.1);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.depthFunc(gl.LEQUAL);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    this.meshRegistry = {};
    this.meshRegistryKeys = [];

    this.cutoutRegistry = {};

    this.cutoutRegistryKeys = [];

    /**
     * Lights
     */
    this.numLights = 0;
    this.ambientLightColor = [0, 0, 0];
    this.lightRegistry = {};
    this.lightRegistryKeys = [];
    this.lightPositions = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.lightColors = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    this.textureManager = new TextureManager(gl);
    this.texCache = {};
    this.bufferRegistry = new BufferRegistry(gl);
    this.program = new Program(gl, { debug: true });

    this.state = {
        boundArrayBuffer: null,
        boundElementBuffer: null,
        lastDrawn: null,
        enabledAttributes: {},
        enabledAttributesKeys: []
    };

    this.resolutionName = ['u_resolution'];
    this.resolutionValues = [];

    this.cachedSize = [];

    /*
    The projectionTransform has some constant components, i.e. the z scale, and the x and y translation.

    The z scale keeps the final z position of any vertex within the clip's domain by scaling it by an
    arbitrarily small coefficient. This has the advantage of being a useful default in the event of the
    user forgoing a near and far plane, an alien convention in dom space as in DOM overlapping is
    conducted via painter's algorithm.

    The x and y translation transforms the world space origin to the top left corner of the screen.

    The final component (this.projectionTransform[15]) is initialized as 1 because certain projection models,
    e.g. the WC3 specified model, keep the XY plane as the projection hyperplane.
    */
    this.projectionTransform = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -0.000001, 0, -1, 1, 0, 1];

    // TODO: remove this hack

    var cutout = this.cutoutGeometry = new Plane();

    this.bufferRegistry.allocate(cutout.spec.id, 'a_pos', cutout.spec.bufferValues[0], 3);
    this.bufferRegistry.allocate(cutout.spec.id, 'a_texCoord', cutout.spec.bufferValues[1], 2);
    this.bufferRegistry.allocate(cutout.spec.id, 'a_normals', cutout.spec.bufferValues[2], 3);
    this.bufferRegistry.allocate(cutout.spec.id, 'indices', cutout.spec.bufferValues[3], 1);
}

/**
 * Attempts to retreive the WebGLRenderer context using several
 * accessors. For browser compatability. Throws on error.
 *
 * @method
 *
 * @param {Object} canvas Canvas element from which the context is retreived
 *
 * @return {Object} WebGLContext of canvas element
 */
WebGLRenderer.prototype.getWebGLContext = function getWebGLContext(canvas) {
    var names = ['webgl', 'experimental-webgl', 'webkit-3d', 'moz-webgl'];
    var context = null;
    for (var i = 0; i < names.length; i++) {
        try {
            context = canvas.getContext(names[i]);
        }
        catch (error) {
            var msg = 'Error creating WebGL context: ' + error.prototype.toString();
            console.error(msg);
        }
        if (context) {
            break;
        }
    }
    return context ? context : false;
};

/**
 * Adds a new base spec to the light registry at a given path.
 *
 * @method
 *
 * @param {String} path Path used as id of new light in lightRegistry
 *
 * @return {Object} Newly created light spec
 */
WebGLRenderer.prototype.createLight = function createLight(path) {
    this.numLights++;
    this.lightRegistryKeys.push(path);
    this.lightRegistry[path] = {
        color: [0, 0, 0],
        position: [0, 0, 0]
    };
    return this.lightRegistry[path];
};

/**
 * Adds a new base spec to the mesh registry at a given path.
 *
 * @method
 *
 * @param {String} path Path used as id of new mesh in meshRegistry.
 *
 * @return {Object} Newly created mesh spec.
 */
WebGLRenderer.prototype.createMesh = function createMesh(path) {
    this.meshRegistryKeys.push(path);

    var uniforms = keyValueToArrays({
        u_opacity: 1,
        u_transform: identity,
        u_size: [0, 0, 0],
        u_baseColor: [0.5, 0.5, 0.5, 1],
        u_positionOffset: [0, 0, 0],
        u_normals: [0, 0, 0],
        u_flatShading: 0,
        u_glossiness: [0, 0, 0, 0]
    });
    this.meshRegistry[path] = {
        depth: null,
        uniformKeys: uniforms.keys,
        uniformValues: uniforms.values,
        buffers: {},
        geometry: null,
        drawType: null,
        textures: [],
        visible: true
    };
    return this.meshRegistry[path];
};

/**
 * Sets flag on indicating whether to do skip draw phase for
 * cutout mesh at given path.
 *
 * @method
 *
 * @param {String} path Path used as id of target cutout mesh.
 * @param {Boolean} usesCutout Indicates the presence of a cutout mesh
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.setCutoutState = function setCutoutState(path, usesCutout) {
    var cutout = this.getOrSetCutout(path);

    cutout.visible = usesCutout;
};

/**
 * Creates or retreives cutout
 *
 * @method
 *
 * @param {String} path Path used as id of target cutout mesh.
 *
 * @return {Object} Newly created cutout spec.
 */
WebGLRenderer.prototype.getOrSetCutout = function getOrSetCutout(path) {
    if (this.cutoutRegistry[path]) {
        return this.cutoutRegistry[path];
    }
    else {
        var uniforms = keyValueToArrays({
            u_opacity: 0,
            u_transform: identity.slice(),
            u_size: [0, 0, 0],
            u_origin: [0, 0, 0],
            u_baseColor: [0, 0, 0, 1]
        });

        this.cutoutRegistryKeys.push(path);

        this.cutoutRegistry[path] = {
            uniformKeys: uniforms.keys,
            uniformValues: uniforms.values,
            geometry: this.cutoutGeometry.spec.id,
            drawType: this.cutoutGeometry.spec.type,
            visible: true
        };

        return this.cutoutRegistry[path];
    }
};

/**
 * Sets flag on indicating whether to do skip draw phase for
 * mesh at given path.
 *
 * @method
 * @param {String} path Path used as id of target mesh.
 * @param {Boolean} visibility Indicates the visibility of target mesh.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.setMeshVisibility = function setMeshVisibility(path, visibility) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);

    mesh.visible = visibility;
};

/**
 * Deletes a mesh from the meshRegistry.
 *
 * @method
 * @param {String} path Path used as id of target mesh.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.removeMesh = function removeMesh(path) {
    var keyLocation = this.meshRegistryKeys.indexOf(path);
    this.meshRegistryKeys.splice(keyLocation, 1);
    this.meshRegistry[path] = null;
};

/**
 * Creates or retreives cutout
 *
 * @method
 * @param {String} path Path used as id of cutout in cutout registry.
 * @param {String} uniformName Identifier used to upload value
 * @param {Array} uniformValue Value of uniform data
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.setCutoutUniform = function setCutoutUniform(path, uniformName, uniformValue) {
    var cutout = this.getOrSetCutout(path);

    var index = cutout.uniformKeys.indexOf(uniformName);

    if (Array.isArray(uniformValue)) {
        for (var i = 0, len = uniformValue.length; i < len; i++) {
            cutout.uniformValues[index][i] = uniformValue[i];
        }
    }
    else {
        cutout.uniformValues[index] = uniformValue;
    }
};

/**
 * Edits the options field on a mesh
 *
 * @method
 * @param {String} path Path used as id of target mesh
 * @param {Object} options Map of draw options for mesh
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setMeshOptions = function(path, options) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);

    mesh.options = options;
    return this;
};

/**
 * Changes the color of the fixed intensity lighting in the scene
 *
 * @method
 *
 * @param {String} path Path used as id of light
 * @param {Number} r red channel
 * @param {Number} g green channel
 * @param {Number} b blue channel
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setAmbientLightColor = function setAmbientLightColor(path, r, g, b) {
    this.ambientLightColor[0] = r;
    this.ambientLightColor[1] = g;
    this.ambientLightColor[2] = b;
    return this;
};

/**
 * Changes the location of the light in the scene
 *
 * @method
 *
 * @param {String} path Path used as id of light
 * @param {Number} x x position
 * @param {Number} y y position
 * @param {Number} z z position
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setLightPosition = function setLightPosition(path, x, y, z) {
    var light = this.lightRegistry[path] || this.createLight(path);

    light.position[0] = x;
    light.position[1] = y;
    light.position[2] = z;
    return this;
};

/**
 * Changes the color of a dynamic intensity lighting in the scene
 *
 * @method
 *
 * @param {String} path Path used as id of light in light Registry.
 * @param {Number} r red channel
 * @param {Number} g green channel
 * @param {Number} b blue channel
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setLightColor = function setLightColor(path, r, g, b) {
    var light = this.lightRegistry[path] || this.createLight(path);

    light.color[0] = r;
    light.color[1] = g;
    light.color[2] = b;
    return this;
};

/**
 * Compiles material spec into program shader
 *
 * @method
 *
 * @param {String} path Path used as id of cutout in cutout registry.
 * @param {String} name Name that the rendering input the material is bound to
 * @param {Object} material Material spec
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.handleMaterialInput = function handleMaterialInput(path, name, material) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);
    material = compileMaterial(material, mesh.textures.length);

    // Set uniforms to enable texture!

    mesh.uniformValues[mesh.uniformKeys.indexOf(name)][0] = -material._id;

    // Register textures!

    var i = material.textures.length;
    while (i--) {
        mesh.textures.push(
            this.textureManager.register(material.textures[i], mesh.textures.length + i)
        );
    }

    // Register material!

    this.program.registerMaterial(name, material);

    return this.updateSize();
};

/**
 * Changes the geometry data of a mesh
 *
 * @method
 *
 * @param {String} path Path used as id of cutout in cutout registry.
 * @param {Object} geometry Geometry object containing vertex data to be drawn
 * @param {Number} drawType Primitive identifier
 * @param {Boolean} dynamic Whether geometry is dynamic
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setGeometry = function setGeometry(path, geometry, drawType, dynamic) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);

    mesh.geometry = geometry;
    mesh.drawType = drawType;
    mesh.dynamic = dynamic;

    return this;
};

/**
 * Uploads a new value for the uniform data when the mesh is being drawn
 *
 * @method
 *
 * @param {String} path Path used as id of mesh in mesh registry
 * @param {String} uniformName Identifier used to upload value
 * @param {Array} uniformValue Value of uniform data
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setMeshUniform = function setMeshUniform(path, uniformName, uniformValue) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);

    var index = mesh.uniformKeys.indexOf(uniformName);

    if (index === -1) {
        mesh.uniformKeys.push(uniformName);
        mesh.uniformValues.push(uniformValue);
    }
    else {
        mesh.uniformValues[index] = uniformValue;
    }
};

/**
 * Triggers the 'draw' phase of the WebGLRenderer. Iterates through registries
 * to set uniforms, set attributes and issue draw commands for renderables.
 *
 * @method
 *
 * @param {String} path Path used as id of mesh in mesh registry
 * @param {Number} geometryId Id of geometry in geometry registry
 * @param {String} bufferName Attribute location name
 * @param {Array} bufferValue Vertex data
 * @param {Number} bufferSpacing The dimensions of the vertex
 * @param {Boolean} isDynamic Whether geometry is dynamic
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.bufferData = function bufferData(path, geometryId, bufferName, bufferValue, bufferSpacing, isDynamic) {
    this.bufferRegistry.allocate(geometryId, bufferName, bufferValue, bufferSpacing, isDynamic);

    return this;
};

/**
 * Triggers the 'draw' phase of the WebGLRenderer. Iterates through registries
 * to set uniforms, set attributes and issue draw commands for renderables.
 *
 * @method
 *
 * @param {Object} renderState Parameters provided by the compositor, that affect the rendering of all renderables.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.draw = function draw(renderState) {
    var time = this.compositor.getTime();

    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.textureManager.update(time);

    this.meshRegistryKeys = sorter(this.meshRegistryKeys, this.meshRegistry);

    this.setGlobalUniforms(renderState);
    this.drawCutouts();
    this.drawMeshes();
};

/**
 * Iterates through and draws all registered meshes. This includes
 * binding textures, handling draw options, setting mesh uniforms
 * and drawing mesh buffers.
 *
 * @method
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.drawMeshes = function drawMeshes() {
    var gl = this.gl;
    var buffers;
    var mesh;

    for(var i = 0; i < this.meshRegistryKeys.length; i++) {
        mesh = this.meshRegistry[this.meshRegistryKeys[i]];
        buffers = this.bufferRegistry.registry[mesh.geometry];

        if (!mesh.visible) continue;

        if (mesh.uniformValues[0] < 1) {
            gl.depthMask(false);
            gl.enable(gl.BLEND);
        }
        else {
            gl.depthMask(true);
            gl.disable(gl.BLEND);
        }

        if (!buffers) continue;

        var j = mesh.textures.length;
        while (j--) this.textureManager.bindTexture(mesh.textures[j]);

        if (mesh.options) this.handleOptions(mesh.options, mesh);

        this.program.setUniforms(mesh.uniformKeys, mesh.uniformValues);
        this.drawBuffers(buffers, mesh.drawType, mesh.geometry);

        if (mesh.options) this.resetOptions(mesh.options);
    }
};

/**
 * Iterates through and draws all registered cutout meshes. Blending
 * is disabled, cutout uniforms are set and finally buffers are drawn.
 *
 * @method
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.drawCutouts = function drawCutouts() {
    var cutout;
    var buffers;
    var len = this.cutoutRegistryKeys.length;

    if (len) {
        this.gl.enable(this.gl.BLEND);
        this.gl.depthMask(true);
    }

    for (var i = 0; i < len; i++) {
        cutout = this.cutoutRegistry[this.cutoutRegistryKeys[i]];
        buffers = this.bufferRegistry.registry[cutout.geometry];

        if (!cutout.visible) continue;

        this.program.setUniforms(cutout.uniformKeys, cutout.uniformValues);
        this.drawBuffers(buffers, cutout.drawType, cutout.geometry);
    }
};

/**
 * Sets uniforms to be shared by all meshes.
 *
 * @method
 *
 * @param {Object} renderState Draw state options passed down from compositor.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.setGlobalUniforms = function setGlobalUniforms(renderState) {
    var light;
    var stride;

    for (var i = 0, len = this.lightRegistryKeys.length; i < len; i++) {
        light = this.lightRegistry[this.lightRegistryKeys[i]];
        stride = i * 4;

        // Build the light positions' 4x4 matrix

        this.lightPositions[0 + stride] = light.position[0];
        this.lightPositions[1 + stride] = light.position[1];
        this.lightPositions[2 + stride] = light.position[2];

        // Build the light colors' 4x4 matrix

        this.lightColors[0 + stride] = light.color[0];
        this.lightColors[1 + stride] = light.color[1];
        this.lightColors[2 + stride] = light.color[2];
    }

    globalUniforms.values[0] = this.numLights;
    globalUniforms.values[1] = this.ambientLightColor;
    globalUniforms.values[2] = this.lightPositions;
    globalUniforms.values[3] = this.lightColors;

    /*
     * Set time and projection uniforms
     * projecting world space into a 2d plane representation of the canvas.
     * The x and y scale (this.projectionTransform[0] and this.projectionTransform[5] respectively)
     * convert the projected geometry back into clipspace.
     * The perpective divide (this.projectionTransform[11]), adds the z value of the point
     * multiplied by the perspective divide to the w value of the point. In the process
     * of converting from homogenous coordinates to NDC (normalized device coordinates)
     * the x and y values of the point are divided by w, which implements perspective.
     */
    this.projectionTransform[0] = 1 / (this.cachedSize[0] * 0.5);
    this.projectionTransform[5] = -1 / (this.cachedSize[1] * 0.5);
    this.projectionTransform[11] = renderState.perspectiveTransform[11];

    globalUniforms.values[4] = this.projectionTransform;
    globalUniforms.values[5] = this.compositor.getTime() * 0.001;
    globalUniforms.values[6] = renderState.viewTransform;

    this.program.setUniforms(globalUniforms.keys, globalUniforms.values);
};

/**
 * Loads the buffers and issues the draw command for a geometry.
 *
 * @method
 *
 * @param {Object} vertexBuffers All buffers used to draw the geometry.
 * @param {Number} mode Enumerator defining what primitive to draw
 * @param {Number} id ID of geometry being drawn.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.drawBuffers = function drawBuffers(vertexBuffers, mode, id) {
    var gl = this.gl;
    var length = 0;
    var attribute;
    var location;
    var spacing;
    var offset;
    var buffer;
    var iter;
    var j;
    var i;

    iter = vertexBuffers.keys.length;
    for (i = 0; i < iter; i++) {
        attribute = vertexBuffers.keys[i];

        // Do not set vertexAttribPointer if index buffer.

        if (attribute === 'indices') {
            j = i; continue;
        }

        // Retreive the attribute location and make sure it is enabled.

        location = this.program.attributeLocations[attribute];

        if (location === -1) continue;
        if (location === undefined) {
            location = gl.getAttribLocation(this.program.program, attribute);
            this.program.attributeLocations[attribute] = location;
            if (location === -1) continue;
        }

        if (!this.state.enabledAttributes[attribute]) {
            gl.enableVertexAttribArray(location);
            this.state.enabledAttributes[attribute] = true;
            this.state.enabledAttributesKeys.push(attribute);
        }

        // Retreive buffer information used to set attribute pointer.

        buffer = vertexBuffers.values[i];
        spacing = vertexBuffers.spacing[i];
        offset = vertexBuffers.offset[i];
        length = vertexBuffers.length[i];

        // Skip bindBuffer if buffer is currently bound.

        if (this.state.boundArrayBuffer !== buffer) {
            gl.bindBuffer(buffer.target, buffer.buffer);
            this.state.boundArrayBuffer = buffer;
        }

        if (this.state.lastDrawn !== id) {
            gl.vertexAttribPointer(location, spacing, gl.FLOAT, gl.FALSE, 0, 4 * offset);
        }
    }

    // Disable any attributes that not currently being used.

    var len = this.state.enabledAttributesKeys.length;
    for (i = 0; i < len; i++) {
        var key = this.state.enabledAttributesKeys[i];
        if (this.state.enabledAttributes[key] && vertexBuffers.keys.indexOf(key) === -1) {
            gl.disableVertexAttribArray(this.program.attributeLocations[key]);
            this.state.enabledAttributes[key] = false;
        }
    }

    if (length) {

        // If index buffer, use drawElements.

        if (j !== undefined) {
            buffer = vertexBuffers.values[j];
            offset = vertexBuffers.offset[j];
            spacing = vertexBuffers.spacing[j];
            length = vertexBuffers.length[j];

            // Skip bindBuffer if buffer is currently bound.

            if (this.state.boundElementBuffer !== buffer) {
                gl.bindBuffer(buffer.target, buffer.buffer);
                this.state.boundElementBuffer = buffer;
            }

            gl.drawElements(gl[mode], length, gl.UNSIGNED_SHORT, 2 * offset);
        }
        else {
            gl.drawArrays(gl[mode], 0, length);
        }
    }

    this.state.lastDrawn = id;
};

/**
 * Updates the width and height of parent canvas, sets the viewport size on
 * the WebGL context and updates the resolution uniform for the shader program.
 * Size is retreived from the container object of the renderer.
 *
 * @method
 *
 * @param {Array} size width, height and depth of canvas
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.updateSize = function updateSize(size) {
    if (size) {
        this.cachedSize[0] = size[0];
        this.cachedSize[1] = size[1];
        this.cachedSize[2] = (size[0] > size[1]) ? size[0] : size[1];
    }

    this.gl.viewport(0, 0, this.cachedSize[0], this.cachedSize[1]);

    this.resolutionValues[0] = this.cachedSize;
    this.program.setUniforms(this.resolutionName, this.resolutionValues);

    return this;
};

/**
 * Updates the state of the WebGL drawing context based on custom parameters
 * defined on a mesh.
 *
 * @method
 *
 * @param {Object} options Draw state options to be set to the context.
 * @param {Mesh} mesh Associated Mesh
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.handleOptions = function handleOptions(options, mesh) {
    var gl = this.gl;
    if (!options) return;

    if (options.side === 'double') {
        this.gl.cullFace(this.gl.FRONT);
        this.drawBuffers(this.bufferRegistry.registry[mesh.geometry], mesh.drawType, mesh.geometry);
        this.gl.cullFace(this.gl.BACK);
    }

    if (options.blending) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    if (options.side === 'back') gl.cullFace(gl.FRONT);
};

/**
 * Resets the state of the WebGL drawing context to default values.
 *
 * @method
 *
 * @param {Object} options Draw state options to be set to the context.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.resetOptions = function resetOptions(options) {
    var gl = this.gl;
    if (!options) return;
    if (options.blending) gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    if (options.side === 'back') gl.cullFace(gl.BACK);
};

WebGLRenderer.DEFAULT_STYLES = {
    pointerEvents: 'none',
    position: 'absolute',
    zIndex: 1,
    top: '0px',
    left: '0px'
};

module.exports = WebGLRenderer;

},{"../utilities/keyValueToArrays":38,"../webgl-geometries/primitives/Plane":42,"./BufferRegistry":44,"./Program":46,"./TextureManager":48,"./compileMaterial":50,"./radixSort":52}],50:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
'use strict';

var types = {
    1: 'float ',
    2: 'vec2 ',
    3: 'vec3 ',
    4: 'vec4 '
};

/**
 * Traverses material to create a string of glsl code to be applied in
 * the vertex or fragment shader.
 *
 * @method
 * @protected
 *
 * @param {Object} material Material to be compiled.
 * @param {Number} textureSlot Next available texture slot for Mesh.
 *
 * @return {undefined} undefined
 */
function compileMaterial(material, textureSlot) {
    var glsl = '';
    var uniforms = {};
    var varyings = {};
    var attributes = {};
    var defines = [];
    var textures = [];

    _traverse(material, function (node, depth) {
        if (! node.chunk) return;

        var type = types[_getOutputLength(node)];
        var label = _makeLabel(node);
        var output = _processGLSL(node.chunk.glsl, node.inputs, textures.length + textureSlot);

        glsl += type + label + ' = ' + output + '\n ';

        if (node.uniforms) _extend(uniforms, node.uniforms);
        if (node.varyings) _extend(varyings, node.varyings);
        if (node.attributes) _extend(attributes, node.attributes);
        if (node.chunk.defines) defines.push(node.chunk.defines);
        if (node.texture) textures.push(node.texture);
    });

    return {
        _id: material._id,
        glsl: glsl + 'return ' + _makeLabel(material) + ';',
        defines: defines.join('\n'),
        uniforms: uniforms,
        varyings: varyings,
        attributes: attributes,
        textures: textures
    };
}

// Recursively iterates over a material's inputs, invoking a given callback
// with the current material
function _traverse(material, callback) {
	var inputs = material.inputs;
    var len = inputs && inputs.length;
    var idx = -1;

    while (++idx < len) _traverse(inputs[idx], callback);

    callback(material);

    return material;
}

// Helper function used to infer length of the output
// from a given material node.
function _getOutputLength(node) {

    // Handle constant values

    if (typeof node === 'number') return 1;
    if (Array.isArray(node)) return node.length;

    // Handle materials

    var output = node.chunk.output;
    if (typeof output === 'number') return output;

    // Handle polymorphic output

    var key = node.inputs.map(function recurse(node) {
        return _getOutputLength(node);
    }).join(',');

    return output[key];
}

// Helper function to run replace inputs and texture tags with
// correct glsl.
function _processGLSL(str, inputs, textureSlot) {
    return str
        .replace(/%\d/g, function (s) {
            return _makeLabel(inputs[s[1]-1]);
        })
        .replace(/\$TEXTURE/, 'u_textures[' + textureSlot + ']');
}

// Helper function used to create glsl definition of the
// input material node.
function _makeLabel (n) {
    if (Array.isArray(n)) return _arrayToVec(n);
    if (typeof n === 'object') return 'fa_' + (n._id);
    else return n.toFixed(6);
}

// Helper to copy the properties of an object onto another object.
function _extend (a, b) {
	for (var k in b) a[k] = b[k];
}

// Helper to create glsl vector representation of a javascript array.
function _arrayToVec(array) {
    var len = array.length;
    return 'vec' + len + '(' + array.join(',')  + ')';
}

module.exports = compileMaterial;

},{}],51:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

// Generates a checkerboard pattern to be used as a placeholder texture while an
// image loads over the network.
function createCheckerBoard() {
    var context = document.createElement('canvas').getContext('2d');
    context.canvas.width = context.canvas.height = 128;
    for (var y = 0; y < context.canvas.height; y += 16) {
        for (var x = 0; x < context.canvas.width; x += 16) {
            context.fillStyle = (x ^ y) & 16 ? '#FFF' : '#DDD';
            context.fillRect(x, y, 16, 16);
        }
    }

    return context.canvas;
}

module.exports = createCheckerBoard;

},{}],52:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
'use strict';

var radixBits = 11,
    maxRadix = 1 << (radixBits),
    radixMask = maxRadix - 1,
    buckets = new Array(maxRadix * Math.ceil(64 / radixBits)),
    msbMask = 1 << ((32 - 1) % radixBits),
    lastMask = (msbMask << 1) - 1,
    passCount = ((32 / radixBits) + 0.999999999999999) | 0,
    maxOffset = maxRadix * (passCount - 1),
    normalizer = Math.pow(20, 6);

var buffer = new ArrayBuffer(4);
var floatView = new Float32Array(buffer, 0, 1);
var intView = new Int32Array(buffer, 0, 1);

// comparator pulls relevant sorting keys out of mesh
function comp(list, registry, i) {
    var key = list[i];
    var item = registry[key];
    return (item.depth ? item.depth : registry[key].uniformValues[1][14]) + normalizer;
}

//mutator function records mesh's place in previous pass
function mutator(list, registry, i, value) {
    var key = list[i];
    registry[key].depth = intToFloat(value) - normalizer;
    return key;
}

//clean function removes mutator function's record
function clean(list, registry, i) {
    registry[list[i]].depth = null;
}

//converts a javascript float to a 32bit integer using an array buffer
//of size one
function floatToInt(k) {
    floatView[0] = k;
    return intView[0];
}
//converts a 32 bit integer to a regular javascript float using an array buffer
//of size one
function intToFloat(k) {
    intView[0] = k;
    return floatView[0];
}

//sorts a list of mesh IDs according to their z-depth
function radixSort(list, registry) {
    var pass = 0;
    var out = [];

    var i, j, k, n, div, offset, swap, id, sum, tsum, size;

    passCount = ((32 / radixBits) + 0.999999999999999) | 0;

    for (i = 0, n = maxRadix * passCount; i < n; i++) buckets[i] = 0;

    for (i = 0, n = list.length; i < n; i++) {
        div = floatToInt(comp(list, registry, i));
        div ^= div >> 31 | 0x80000000;
        for (j = 0, k = 0; j < maxOffset; j += maxRadix, k += radixBits) {
            buckets[j + (div >>> k & radixMask)]++;
        }
        buckets[j + (div >>> k & lastMask)]++;
    }

    for (j = 0; j <= maxOffset; j += maxRadix) {
        for (id = j, sum = 0; id < j + maxRadix; id++) {
            tsum = buckets[id] + sum;
            buckets[id] = sum - 1;
            sum = tsum;
        }
    }
    if (--passCount) {
        for (i = 0, n = list.length; i < n; i++) {
            div = floatToInt(comp(list, registry, i));
            out[++buckets[div & radixMask]] = mutator(list, registry, i, div ^= div >> 31 | 0x80000000);
        }
        
        swap = out;
        out = list;
        list = swap;
        while (++pass < passCount) {
            for (i = 0, n = list.length, offset = pass * maxRadix, size = pass * radixBits; i < n; i++) {
                div = floatToInt(comp(list, registry, i));
                out[++buckets[offset + (div >>> size & radixMask)]] = list[i];
            }

            swap = out;
            out = list;
            list = swap;
        }
    }

    for (i = 0, n = list.length, offset = pass * maxRadix, size = pass * radixBits; i < n; i++) {
        div = floatToInt(comp(list, registry, i));
        out[++buckets[offset + (div >>> size & lastMask)]] = mutator(list, registry, i, div ^ (~div >> 31 | 0x80000000));
        clean(list, registry, i);
    }

    return out;
}

module.exports = radixSort;

},{}],53:[function(require,module,exports){
"use strict";
var glslify = require("glslify");
var shaders = require("glslify/simple-adapter.js")("\n#define GLSLIFY 1\n\nmat3 a_x_getNormalMatrix(in mat4 t) {\n  mat3 matNorm;\n  mat4 a = t;\n  float a00 = a[0][0], a01 = a[0][1], a02 = a[0][2], a03 = a[0][3], a10 = a[1][0], a11 = a[1][1], a12 = a[1][2], a13 = a[1][3], a20 = a[2][0], a21 = a[2][1], a22 = a[2][2], a23 = a[2][3], a30 = a[3][0], a31 = a[3][1], a32 = a[3][2], a33 = a[3][3], b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32, det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;\n  det = 1.0 / det;\n  matNorm[0][0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;\n  matNorm[0][1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;\n  matNorm[0][2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;\n  matNorm[1][0] = (a02 * b10 - a01 * b11 - a03 * b09) * det;\n  matNorm[1][1] = (a00 * b11 - a02 * b08 + a03 * b07) * det;\n  matNorm[1][2] = (a01 * b08 - a00 * b10 - a03 * b06) * det;\n  matNorm[2][0] = (a31 * b05 - a32 * b04 + a33 * b03) * det;\n  matNorm[2][1] = (a32 * b02 - a30 * b05 - a33 * b01) * det;\n  matNorm[2][2] = (a30 * b04 - a31 * b02 + a33 * b00) * det;\n  return matNorm;\n}\nfloat b_x_inverse(float m) {\n  return 1.0 / m;\n}\nmat2 b_x_inverse(mat2 m) {\n  return mat2(m[1][1], -m[0][1], -m[1][0], m[0][0]) / (m[0][0] * m[1][1] - m[0][1] * m[1][0]);\n}\nmat3 b_x_inverse(mat3 m) {\n  float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2];\n  float a10 = m[1][0], a11 = m[1][1], a12 = m[1][2];\n  float a20 = m[2][0], a21 = m[2][1], a22 = m[2][2];\n  float b01 = a22 * a11 - a12 * a21;\n  float b11 = -a22 * a10 + a12 * a20;\n  float b21 = a21 * a10 - a11 * a20;\n  float det = a00 * b01 + a01 * b11 + a02 * b21;\n  return mat3(b01, (-a22 * a01 + a02 * a21), (a12 * a01 - a02 * a11), b11, (a22 * a00 - a02 * a20), (-a12 * a00 + a02 * a10), b21, (-a21 * a00 + a01 * a20), (a11 * a00 - a01 * a10)) / det;\n}\nmat4 b_x_inverse(mat4 m) {\n  float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2], a03 = m[0][3], a10 = m[1][0], a11 = m[1][1], a12 = m[1][2], a13 = m[1][3], a20 = m[2][0], a21 = m[2][1], a22 = m[2][2], a23 = m[2][3], a30 = m[3][0], a31 = m[3][1], a32 = m[3][2], a33 = m[3][3], b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32, det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;\n  return mat4(a11 * b11 - a12 * b10 + a13 * b09, a02 * b10 - a01 * b11 - a03 * b09, a31 * b05 - a32 * b04 + a33 * b03, a22 * b04 - a21 * b05 - a23 * b03, a12 * b08 - a10 * b11 - a13 * b07, a00 * b11 - a02 * b08 + a03 * b07, a32 * b02 - a30 * b05 - a33 * b01, a20 * b05 - a22 * b02 + a23 * b01, a10 * b10 - a11 * b08 + a13 * b06, a01 * b08 - a00 * b10 - a03 * b06, a30 * b04 - a31 * b02 + a33 * b00, a21 * b02 - a20 * b04 - a23 * b00, a11 * b07 - a10 * b09 - a12 * b06, a00 * b09 - a01 * b07 + a02 * b06, a31 * b01 - a30 * b03 - a32 * b00, a20 * b03 - a21 * b01 + a22 * b00) / det;\n}\nfloat c_x_transpose(float m) {\n  return m;\n}\nmat2 c_x_transpose(mat2 m) {\n  return mat2(m[0][0], m[1][0], m[0][1], m[1][1]);\n}\nmat3 c_x_transpose(mat3 m) {\n  return mat3(m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2]);\n}\nmat4 c_x_transpose(mat4 m) {\n  return mat4(m[0][0], m[1][0], m[2][0], m[3][0], m[0][1], m[1][1], m[2][1], m[3][1], m[0][2], m[1][2], m[2][2], m[3][2], m[0][3], m[1][3], m[2][3], m[3][3]);\n}\nvec4 applyTransform(vec4 pos) {\n  mat4 MVMatrix = u_view * u_transform;\n  pos.x += 1.0;\n  pos.y -= 1.0;\n  pos.xyz *= u_size * 0.5;\n  pos.y *= -1.0;\n  v_position = (MVMatrix * pos).xyz;\n  v_eyeVector = (u_resolution * 0.5) - v_position;\n  pos = u_perspective * MVMatrix * pos;\n  return pos;\n}\n#vert_definitions\n\nvec3 calculateOffset(vec3 ID) {\n  \n  #vert_applications\n  return vec3(0.0);\n}\nvoid main() {\n  v_textureCoordinate = a_texCoord;\n  vec3 invertedNormals = a_normals + (u_normals.x < 0.0 ? calculateOffset(u_normals) * 2.0 - 1.0 : vec3(0.0));\n  invertedNormals.y *= -1.0;\n  v_normal = c_x_transpose(mat3(b_x_inverse(u_transform))) * invertedNormals;\n  vec3 offsetPos = a_pos + calculateOffset(u_positionOffset);\n  gl_Position = applyTransform(vec4(offsetPos, 1.0));\n}", "\n#define GLSLIFY 1\n\n#float_definitions\n\nfloat a_x_applyMaterial(float ID) {\n  \n  #float_applications\n  return 1.;\n}\n#vec3_definitions\n\nvec3 a_x_applyMaterial(vec3 ID) {\n  \n  #vec3_applications\n  return vec3(0);\n}\n#vec4_definitions\n\nvec4 a_x_applyMaterial(vec4 ID) {\n  \n  #vec4_applications\n  return vec4(0);\n}\nvec4 b_x_applyLight(in vec4 baseColor, in vec3 normal, in vec4 glossiness) {\n  int numLights = int(u_numLights);\n  vec3 ambientColor = u_ambientLight * baseColor.rgb;\n  vec3 eyeVector = normalize(v_eyeVector);\n  vec3 diffuse = vec3(0.0);\n  bool hasGlossiness = glossiness.a > 0.0;\n  bool hasSpecularColor = length(glossiness.rgb) > 0.0;\n  for(int i = 0; i < 4; i++) {\n    if(i >= numLights)\n      break;\n    vec3 lightDirection = normalize(u_lightPosition[i].xyz - v_position);\n    float lambertian = max(dot(lightDirection, normal), 0.0);\n    if(lambertian > 0.0) {\n      diffuse += u_lightColor[i].rgb * baseColor.rgb * lambertian;\n      if(hasGlossiness) {\n        vec3 halfVector = normalize(lightDirection + eyeVector);\n        float specularWeight = pow(max(dot(halfVector, normal), 0.0), glossiness.a);\n        vec3 specularColor = hasSpecularColor ? glossiness.rgb : u_lightColor[i].rgb;\n        diffuse += specularColor * specularWeight * lambertian;\n      }\n    }\n  }\n  return vec4(ambientColor + diffuse, baseColor.a);\n}\nvoid main() {\n  vec4 material = u_baseColor.r >= 0.0 ? u_baseColor : a_x_applyMaterial(u_baseColor);\n  bool lightsEnabled = (u_flatShading == 0.0) && (u_numLights > 0.0 || length(u_ambientLight) > 0.0);\n  vec3 normal = normalize(v_normal);\n  vec4 glossiness = u_glossiness.x < 0.0 ? a_x_applyMaterial(u_glossiness) : u_glossiness;\n  vec4 color = lightsEnabled ? b_x_applyLight(material, normalize(v_normal), glossiness) : material;\n  gl_FragColor = color;\n  gl_FragColor.a *= u_opacity;\n}", [], []);
module.exports = shaders;
},{"glslify":27,"glslify/simple-adapter.js":28}],54:[function(require,module,exports){
'use strict';

// Famous dependencies
var DOMElement = require('famous/dom-renderables/DOMElement');
var FamousEngine = require('famous/core/FamousEngine');

// Boilerplate code to make your life easier
FamousEngine.init();

// Initialize with a scene; then, add a 'node' to the scene root
var logo = FamousEngine.createScene().addChild();

// Create an [image] DOM element providing the logo 'node' with the 'src' path
new DOMElement(logo, { tagName: 'img' }).setAttribute('src', './images/famous_logo.png');

// Chainable API
logo
// Set size mode to 'absolute' to use absolute pixel values: (width 250px, height 250px)
.setSizeMode('absolute', 'absolute', 'absolute').setAbsoluteSize(250, 250)
// Center the 'node' to the parent (the screen, in this instance)
.setAlign(0.5, 0.5)
// Set the translational origin to the center of the 'node'
.setMountPoint(0.5, 0.5)
// Set the rotational origin to the center of the 'node'
.setOrigin(0.5, 0.5);

// Add a spinner component to the logo 'node' that is called, every frame
var spinner = logo.addComponent({
    onUpdate: function onUpdate(time) {
        logo.setRotation(0, time / 1000, 0);
        logo.requestUpdateOnNextTick(spinner);
    }
});

// Let the magic begin...
logo.requestUpdate(spinner);

},{"famous/core/FamousEngine":6,"famous/dom-renderables/DOMElement":11}]},{},[54])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2NvbXBvbmVudHMvQ2FtZXJhLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL0NoYW5uZWwuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvQ2xvY2suanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvRGlzcGF0Y2guanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvRmFtb3VzRW5naW5lLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL05vZGUuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvU2NlbmUuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvU2l6ZS5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvY29yZS9UcmFuc2Zvcm0uanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJhYmxlcy9ET01FbGVtZW50LmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9kb20tcmVuZGVyZXJzL0RPTVJlbmRlcmVyLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9kb20tcmVuZGVyZXJzL0VsZW1lbnRDYWNoZS5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvZG9tLXJlbmRlcmVycy9NYXRoLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9kb20tcmVuZGVyZXJzL2V2ZW50cy9Db21wb3NpdGlvbkV2ZW50LmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9kb20tcmVuZGVyZXJzL2V2ZW50cy9FdmVudC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvZG9tLXJlbmRlcmVycy9ldmVudHMvRXZlbnRNYXAuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL0ZvY3VzRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL0lucHV0RXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL0tleWJvYXJkRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL01vdXNlRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL1RvdWNoRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL1VJRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL1doZWVsRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL21hdGgvVmVjMi5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvbWF0aC9WZWMzLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9ub2RlX21vZHVsZXMvZ2xzbGlmeS9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9ub2RlX21vZHVsZXMvZ2xzbGlmeS9zaW1wbGUtYWRhcHRlci5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvcG9seWZpbGxzL2FuaW1hdGlvbkZyYW1lLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9wb2x5ZmlsbHMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3JlbmRlci1sb29wcy9SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9yZW5kZXJlcnMvQ29tcG9zaXRvci5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvcmVuZGVyZXJzL0NvbnRleHQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3JlbmRlcmVycy9VSU1hbmFnZXIuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3JlbmRlcmVycy9pbmplY3QtY3NzLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy91dGlsaXRpZXMvQ2FsbGJhY2tTdG9yZS5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvdXRpbGl0aWVzL2Nsb25lLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy91dGlsaXRpZXMva2V5VmFsdWVUb0FycmF5cy5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvdXRpbGl0aWVzL3ZlbmRvclByZWZpeC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtZ2VvbWV0cmllcy9HZW9tZXRyeS5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtZ2VvbWV0cmllcy9HZW9tZXRyeUhlbHBlci5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtZ2VvbWV0cmllcy9wcmltaXRpdmVzL1BsYW5lLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1yZW5kZXJlcnMvQnVmZmVyLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1yZW5kZXJlcnMvQnVmZmVyUmVnaXN0cnkuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXJlbmRlcmVycy9EZWJ1Zy5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL1Byb2dyYW0uanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXJlbmRlcmVycy9UZXh0dXJlLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1yZW5kZXJlcnMvVGV4dHVyZU1hbmFnZXIuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXJlbmRlcmVycy9XZWJHTFJlbmRlcmVyLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1yZW5kZXJlcnMvY29tcGlsZU1hdGVyaWFsLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1yZW5kZXJlcnMvY3JlYXRlQ2hlY2tlcmJvYXJkLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1yZW5kZXJlcnMvcmFkaXhTb3J0LmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1zaGFkZXJzL2luZGV4LmpzIiwiL1VzZXJzL2dsZXBhZ2Uvc2l0ZXMvb25lbmFtZS1mYW1vdXMvc3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9YQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxb0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNscUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5cUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDampCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOTBCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSUE7QUFDQTtBQUNBO0FBQ0E7O0FDSEEsWUFBWSxDQUFDOzs7QUFHYixJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsbUNBQW1DLENBQUMsQ0FBQztBQUM5RCxJQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsMEJBQTBCLENBQUMsQ0FBQzs7O0FBR3ZELFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQzs7O0FBR3BCLElBQUksSUFBSSxHQUFHLFlBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQzs7O0FBR2pELElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUNuQyxZQUFZLENBQUMsS0FBSyxFQUFFLDBCQUEwQixDQUFDLENBQUM7OztBQUdyRCxJQUFJOztDQUVDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUMvQyxlQUFlLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQzs7Q0FFekIsUUFBUSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7O0NBRWxCLGFBQWEsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDOztDQUV2QixTQUFTLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDOzs7QUFHekIsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztBQUM1QixZQUFRLEVBQUUsa0JBQVMsSUFBSSxFQUFFO0FBQ3JCLFlBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksR0FBRyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDcEMsWUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ3pDO0NBQ0osQ0FBQyxDQUFDOzs7QUFHSCxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKiBcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKiBcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqIFxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICogXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQ2FtZXJhIGlzIGEgY29tcG9uZW50IHRoYXQgaXMgcmVzcG9uc2libGUgZm9yIHNlbmRpbmcgaW5mb3JtYXRpb24gdG8gdGhlIHJlbmRlcmVyIGFib3V0IHdoZXJlXG4gKiB0aGUgY2FtZXJhIGlzIGluIHRoZSBzY2VuZS4gIFRoaXMgYWxsb3dzIHRoZSB1c2VyIHRvIHNldCB0aGUgdHlwZSBvZiBwcm9qZWN0aW9uLCB0aGUgZm9jYWwgZGVwdGgsXG4gKiBhbmQgb3RoZXIgcHJvcGVydGllcyB0byBhZGp1c3QgdGhlIHdheSB0aGUgc2NlbmVzIGFyZSByZW5kZXJlZC5cbiAqXG4gKiBAY2xhc3MgQ2FtZXJhXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlIHRvIHdoaWNoIHRoZSBpbnN0YW5jZSBvZiBDYW1lcmEgd2lsbCBiZSBhIGNvbXBvbmVudCBvZlxuICovXG5mdW5jdGlvbiBDYW1lcmEobm9kZSkge1xuICAgIHRoaXMuX25vZGUgPSBub2RlO1xuICAgIHRoaXMuX3Byb2plY3Rpb25UeXBlID0gQ2FtZXJhLk9SVEhPR1JBUEhJQ19QUk9KRUNUSU9OO1xuICAgIHRoaXMuX2ZvY2FsRGVwdGggPSAwO1xuICAgIHRoaXMuX25lYXIgPSAwO1xuICAgIHRoaXMuX2ZhciA9IDA7XG4gICAgdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSA9IGZhbHNlO1xuICAgIHRoaXMuX2lkID0gbm9kZS5hZGRDb21wb25lbnQodGhpcyk7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybSA9IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdKTtcbiAgICB0aGlzLl92aWV3RGlydHkgPSBmYWxzZTtcbiAgICB0aGlzLl9wZXJzcGVjdGl2ZURpcnR5ID0gZmFsc2U7XG4gICAgdGhpcy5zZXRGbGF0KCk7XG59XG5cbkNhbWVyYS5GUlVTVFVNX1BST0pFQ1RJT04gPSAwO1xuQ2FtZXJhLlBJTkhPTEVfUFJPSkVDVElPTiA9IDE7XG5DYW1lcmEuT1JUSE9HUkFQSElDX1BST0pFQ1RJT04gPSAyO1xuXG4vKipcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGNvbXBvbmVudFxuICovXG5DYW1lcmEucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuICdDYW1lcmEnO1xufTtcblxuLyoqXG4gKiBHZXRzIG9iamVjdCBjb250YWluaW5nIHNlcmlhbGl6ZWQgZGF0YSBmb3IgdGhlIGNvbXBvbmVudFxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBzdGF0ZSBvZiB0aGUgY29tcG9uZW50XG4gKi9cbkNhbWVyYS5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiBnZXRWYWx1ZSgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBjb21wb25lbnQ6IHRoaXMudG9TdHJpbmcoKSxcbiAgICAgICAgcHJvamVjdGlvblR5cGU6IHRoaXMuX3Byb2plY3Rpb25UeXBlLFxuICAgICAgICBmb2NhbERlcHRoOiB0aGlzLl9mb2NhbERlcHRoLFxuICAgICAgICBuZWFyOiB0aGlzLl9uZWFyLFxuICAgICAgICBmYXI6IHRoaXMuX2ZhclxuICAgIH07XG59O1xuXG4vKipcbiAqIFNldCB0aGUgY29tcG9uZW50cyBzdGF0ZSBiYXNlZCBvbiBzb21lIHNlcmlhbGl6ZWQgZGF0YVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gc3RhdGUgYW4gb2JqZWN0IGRlZmluaW5nIHdoYXQgdGhlIHN0YXRlIG9mIHRoZSBjb21wb25lbnQgc2hvdWxkIGJlXG4gKlxuICogQHJldHVybiB7Qm9vbGVhbn0gc3RhdHVzIG9mIHRoZSBzZXRcbiAqL1xuQ2FtZXJhLnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uIHNldFZhbHVlKHN0YXRlKSB7XG4gICAgaWYgKHRoaXMudG9TdHJpbmcoKSA9PT0gc3RhdGUuY29tcG9uZW50KSB7XG4gICAgICAgIHRoaXMuc2V0KHN0YXRlLnByb2plY3Rpb25UeXBlLCBzdGF0ZS5mb2NhbERlcHRoLCBzdGF0ZS5uZWFyLCBzdGF0ZS5mYXIpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIGludGVybmFscyBvZiB0aGUgY29tcG9uZW50XG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0eXBlIGFuIGlkIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHR5cGUgb2YgcHJvamVjdGlvbiB0byB1c2VcbiAqIEBwYXJhbSB7TnVtYmVyfSBkZXB0aCB0aGUgZGVwdGggZm9yIHRoZSBwaW5ob2xlIHByb2plY3Rpb24gbW9kZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBuZWFyIHRoZSBkaXN0YW5jZSBvZiB0aGUgbmVhciBjbGlwcGluZyBwbGFuZSBmb3IgYSBmcnVzdHVtIHByb2plY3Rpb25cbiAqIEBwYXJhbSB7TnVtYmVyfSBmYXIgdGhlIGRpc3RhbmN0IG9mIHRoZSBmYXIgY2xpcHBpbmcgcGxhbmUgZm9yIGEgZnJ1c3R1bSBwcm9qZWN0aW9uXG4gKiBcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHN0YXR1cyBvZiB0aGUgc2V0XG4gKi9cbkNhbWVyYS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gc2V0KHR5cGUsIGRlcHRoLCBuZWFyLCBmYXIpIHtcbiAgICBpZiAoIXRoaXMuX3JlcXVlc3RpbmdVcGRhdGUpIHtcbiAgICAgICAgdGhpcy5fbm9kZS5yZXF1ZXN0VXBkYXRlKHRoaXMuX2lkKTtcbiAgICAgICAgdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSA9IHRydWU7XG4gICAgfVxuICAgIHRoaXMuX3Byb2plY3Rpb25UeXBlID0gdHlwZTtcbiAgICB0aGlzLl9mb2NhbERlcHRoID0gZGVwdGg7XG4gICAgdGhpcy5fbmVhciA9IG5lYXI7XG4gICAgdGhpcy5fZmFyID0gZmFyO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIGNhbWVyYSBkZXB0aCBmb3IgYSBwaW5ob2xlIHByb2plY3Rpb24gbW9kZWxcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGRlcHRoIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSBDYW1lcmEgYW5kIHRoZSBvcmlnaW5cbiAqXG4gKiBAcmV0dXJuIHtDYW1lcmF9IHRoaXNcbiAqL1xuQ2FtZXJhLnByb3RvdHlwZS5zZXREZXB0aCA9IGZ1bmN0aW9uIHNldERlcHRoKGRlcHRoKSB7XG4gICAgaWYgKCF0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlKSB7XG4gICAgICAgIHRoaXMuX25vZGUucmVxdWVzdFVwZGF0ZSh0aGlzLl9pZCk7XG4gICAgICAgIHRoaXMuX3JlcXVlc3RpbmdVcGRhdGUgPSB0cnVlO1xuICAgIH1cbiAgICB0aGlzLl9wZXJzcGVjdGl2ZURpcnR5ID0gdHJ1ZTtcbiAgICB0aGlzLl9wcm9qZWN0aW9uVHlwZSA9IENhbWVyYS5QSU5IT0xFX1BST0pFQ1RJT047XG4gICAgdGhpcy5fZm9jYWxEZXB0aCA9IGRlcHRoO1xuICAgIHRoaXMuX25lYXIgPSAwO1xuICAgIHRoaXMuX2ZhciA9IDA7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2V0cyBvYmplY3QgY29udGFpbmluZyBzZXJpYWxpemVkIGRhdGEgZm9yIHRoZSBjb21wb25lbnRcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG5lYXIgZGlzdGFuY2UgZnJvbSB0aGUgbmVhciBjbGlwcGluZyBwbGFuZSB0byB0aGUgY2FtZXJhXG4gKiBAcGFyYW0ge051bWJlcn0gZmFyIGRpc3RhbmNlIGZyb20gdGhlIGZhciBjbGlwcGluZyBwbGFuZSB0byB0aGUgY2FtZXJhXG4gKiBcbiAqIEByZXR1cm4ge0NhbWVyYX0gdGhpc1xuICovXG5DYW1lcmEucHJvdG90eXBlLnNldEZydXN0dW0gPSBmdW5jdGlvbiBzZXRGcnVzdHVtKG5lYXIsIGZhcikge1xuICAgIGlmICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSkge1xuICAgICAgICB0aGlzLl9ub2RlLnJlcXVlc3RVcGRhdGUodGhpcy5faWQpO1xuICAgICAgICB0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB0aGlzLl9wZXJzcGVjdGl2ZURpcnR5ID0gdHJ1ZTtcbiAgICB0aGlzLl9wcm9qZWN0aW9uVHlwZSA9IENhbWVyYS5GUlVTVFVNX1BST0pFQ1RJT047XG4gICAgdGhpcy5fZm9jYWxEZXB0aCA9IDA7XG4gICAgdGhpcy5fbmVhciA9IG5lYXI7XG4gICAgdGhpcy5fZmFyID0gZmFyO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgQ2FtZXJhIHRvIGhhdmUgb3J0aG9ncmFwaGljIHByb2plY3Rpb25cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7Q2FtZXJhfSB0aGlzXG4gKi9cbkNhbWVyYS5wcm90b3R5cGUuc2V0RmxhdCA9IGZ1bmN0aW9uIHNldEZsYXQoKSB7XG4gICAgaWYgKCF0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlKSB7XG4gICAgICAgIHRoaXMuX25vZGUucmVxdWVzdFVwZGF0ZSh0aGlzLl9pZCk7XG4gICAgICAgIHRoaXMuX3JlcXVlc3RpbmdVcGRhdGUgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuX3BlcnNwZWN0aXZlRGlydHkgPSB0cnVlO1xuICAgIHRoaXMuX3Byb2plY3Rpb25UeXBlID0gQ2FtZXJhLk9SVEhPR1JBUEhJQ19QUk9KRUNUSU9OO1xuICAgIHRoaXMuX2ZvY2FsRGVwdGggPSAwO1xuICAgIHRoaXMuX25lYXIgPSAwO1xuICAgIHRoaXMuX2ZhciA9IDA7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogV2hlbiB0aGUgbm9kZSB0aGlzIGNvbXBvbmVudCBpcyBhdHRhY2hlZCB0byB1cGRhdGVzLCB0aGUgQ2FtZXJhIHdpbGxcbiAqIHNlbmQgbmV3IGNhbWVyYSBpbmZvcm1hdGlvbiB0byB0aGUgQ29tcG9zaXRvciB0byB1cGRhdGUgdGhlIHJlbmRlcmluZ1xuICogb2YgdGhlIHNjZW5lLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5DYW1lcmEucHJvdG90eXBlLm9uVXBkYXRlID0gZnVuY3Rpb24gb25VcGRhdGUoKSB7XG4gICAgdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSA9IGZhbHNlO1xuXG4gICAgdmFyIHBhdGggPSB0aGlzLl9ub2RlLmdldExvY2F0aW9uKCk7XG5cbiAgICB0aGlzLl9ub2RlXG4gICAgICAgIC5zZW5kRHJhd0NvbW1hbmQoJ1dJVEgnKVxuICAgICAgICAuc2VuZERyYXdDb21tYW5kKHBhdGgpO1xuXG4gICAgaWYgKHRoaXMuX3BlcnNwZWN0aXZlRGlydHkpIHtcbiAgICAgICAgdGhpcy5fcGVyc3BlY3RpdmVEaXJ0eSA9IGZhbHNlO1xuXG4gICAgICAgIHN3aXRjaCAodGhpcy5fcHJvamVjdGlvblR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgQ2FtZXJhLkZSVVNUVU1fUFJPSkVDVElPTjpcbiAgICAgICAgICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCgnRlJVU1RVTV9QUk9KRUNUSU9OJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fbmVhcik7XG4gICAgICAgICAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fZmFyKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgQ2FtZXJhLlBJTkhPTEVfUFJPSkVDVElPTjpcbiAgICAgICAgICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCgnUElOSE9MRV9QUk9KRUNUSU9OJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fZm9jYWxEZXB0aCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIENhbWVyYS5PUlRIT0dSQVBISUNfUFJPSkVDVElPTjpcbiAgICAgICAgICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCgnT1JUSE9HUkFQSElDX1BST0pFQ1RJT04nKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLl92aWV3RGlydHkpIHtcbiAgICAgICAgdGhpcy5fdmlld0RpcnR5ID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQoJ0NIQU5HRV9WSUVXX1RSQU5TRk9STScpO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzBdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVsxXSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMl0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzNdKTtcblxuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzRdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVs1XSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bNl0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzddKTtcblxuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzhdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVs5XSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTBdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVsxMV0pO1xuXG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTJdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVsxM10pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzE0XSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTVdKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFdoZW4gdGhlIHRyYW5zZm9ybSBvZiB0aGUgbm9kZSB0aGlzIGNvbXBvbmVudCBpcyBhdHRhY2hlZCB0b1xuICogY2hhbmdlcywgaGF2ZSB0aGUgQ2FtZXJhIHVwZGF0ZSBpdHMgcHJvamVjdGlvbiBtYXRyaXggYW5kXG4gKiBpZiBuZWVkZWQsIGZsYWcgdG8gbm9kZSB0byB1cGRhdGUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHRyYW5zZm9ybSBhbiBhcnJheSBkZW5vdGluZyB0aGUgdHJhbnNmb3JtIG1hdHJpeCBvZiB0aGUgbm9kZVxuICpcbiAqIEByZXR1cm4ge0NhbWVyYX0gdGhpc1xuICovXG5DYW1lcmEucHJvdG90eXBlLm9uVHJhbnNmb3JtQ2hhbmdlID0gZnVuY3Rpb24gb25UcmFuc2Zvcm1DaGFuZ2UodHJhbnNmb3JtKSB7XG4gICAgdmFyIGEgPSB0cmFuc2Zvcm07XG4gICAgdGhpcy5fdmlld0RpcnR5ID0gdHJ1ZTtcblxuICAgIGlmICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSkge1xuICAgICAgICB0aGlzLl9ub2RlLnJlcXVlc3RVcGRhdGUodGhpcy5faWQpO1xuICAgICAgICB0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB2YXIgYTAwID0gYVswXSwgYTAxID0gYVsxXSwgYTAyID0gYVsyXSwgYTAzID0gYVszXSxcbiAgICBhMTAgPSBhWzRdLCBhMTEgPSBhWzVdLCBhMTIgPSBhWzZdLCBhMTMgPSBhWzddLFxuICAgIGEyMCA9IGFbOF0sIGEyMSA9IGFbOV0sIGEyMiA9IGFbMTBdLCBhMjMgPSBhWzExXSxcbiAgICBhMzAgPSBhWzEyXSwgYTMxID0gYVsxM10sIGEzMiA9IGFbMTRdLCBhMzMgPSBhWzE1XSxcblxuICAgIGIwMCA9IGEwMCAqIGExMSAtIGEwMSAqIGExMCxcbiAgICBiMDEgPSBhMDAgKiBhMTIgLSBhMDIgKiBhMTAsXG4gICAgYjAyID0gYTAwICogYTEzIC0gYTAzICogYTEwLFxuICAgIGIwMyA9IGEwMSAqIGExMiAtIGEwMiAqIGExMSxcbiAgICBiMDQgPSBhMDEgKiBhMTMgLSBhMDMgKiBhMTEsXG4gICAgYjA1ID0gYTAyICogYTEzIC0gYTAzICogYTEyLFxuICAgIGIwNiA9IGEyMCAqIGEzMSAtIGEyMSAqIGEzMCxcbiAgICBiMDcgPSBhMjAgKiBhMzIgLSBhMjIgKiBhMzAsXG4gICAgYjA4ID0gYTIwICogYTMzIC0gYTIzICogYTMwLFxuICAgIGIwOSA9IGEyMSAqIGEzMiAtIGEyMiAqIGEzMSxcbiAgICBiMTAgPSBhMjEgKiBhMzMgLSBhMjMgKiBhMzEsXG4gICAgYjExID0gYTIyICogYTMzIC0gYTIzICogYTMyLFxuXG4gICAgZGV0ID0gMS8oYjAwICogYjExIC0gYjAxICogYjEwICsgYjAyICogYjA5ICsgYjAzICogYjA4IC0gYjA0ICogYjA3ICsgYjA1ICogYjA2KTtcblxuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMF0gPSAoYTExICogYjExIC0gYTEyICogYjEwICsgYTEzICogYjA5KSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzFdID0gKGEwMiAqIGIxMCAtIGEwMSAqIGIxMSAtIGEwMyAqIGIwOSkgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVsyXSA9IChhMzEgKiBiMDUgLSBhMzIgKiBiMDQgKyBhMzMgKiBiMDMpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bM10gPSAoYTIyICogYjA0IC0gYTIxICogYjA1IC0gYTIzICogYjAzKSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzRdID0gKGExMiAqIGIwOCAtIGExMCAqIGIxMSAtIGExMyAqIGIwNykgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVs1XSA9IChhMDAgKiBiMTEgLSBhMDIgKiBiMDggKyBhMDMgKiBiMDcpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bNl0gPSAoYTMyICogYjAyIC0gYTMwICogYjA1IC0gYTMzICogYjAxKSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzddID0gKGEyMCAqIGIwNSAtIGEyMiAqIGIwMiArIGEyMyAqIGIwMSkgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVs4XSA9IChhMTAgKiBiMTAgLSBhMTEgKiBiMDggKyBhMTMgKiBiMDYpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bOV0gPSAoYTAxICogYjA4IC0gYTAwICogYjEwIC0gYTAzICogYjA2KSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzEwXSA9IChhMzAgKiBiMDQgLSBhMzEgKiBiMDIgKyBhMzMgKiBiMDApICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTFdID0gKGEyMSAqIGIwMiAtIGEyMCAqIGIwNCAtIGEyMyAqIGIwMCkgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVsxMl0gPSAoYTExICogYjA3IC0gYTEwICogYjA5IC0gYTEyICogYjA2KSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzEzXSA9IChhMDAgKiBiMDkgLSBhMDEgKiBiMDcgKyBhMDIgKiBiMDYpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTRdID0gKGEzMSAqIGIwMSAtIGEzMCAqIGIwMyAtIGEzMiAqIGIwMCkgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVsxNV0gPSAoYTIwICogYjAzIC0gYTIxICogYjAxICsgYTIyICogYjAwKSAqIGRldDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FtZXJhO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIENoYW5uZWxzIGFyZSBiZWluZyB1c2VkIGZvciBpbnRlcmFjdGluZyB3aXRoIHRoZSBVSSBUaHJlYWQgd2hlbiBydW5uaW5nIGluXG4gKiBhIFdlYiBXb3JrZXIgb3Igd2l0aCB0aGUgVUlNYW5hZ2VyLyBDb21wb3NpdG9yIHdoZW4gcnVubmluZyBpbiBzaW5nbGVcbiAqIHRocmVhZGVkIG1vZGUgKG5vIFdlYiBXb3JrZXIpLlxuICpcbiAqIEBjbGFzcyBDaGFubmVsXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gQ2hhbm5lbCgpIHtcbiAgICBpZiAodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnICYmIHNlbGYud2luZG93ICE9PSBzZWxmKSB7XG4gICAgICAgIHRoaXMuX2VudGVyV29ya2VyTW9kZSgpO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIENhbGxlZCBkdXJpbmcgY29uc3RydWN0aW9uLiBTdWJzY3JpYmVzIGZvciBgbWVzc2FnZWAgZXZlbnQgYW5kIHJvdXRlcyBhbGxcbiAqIGZ1dHVyZSBgc2VuZE1lc3NhZ2VgIG1lc3NhZ2VzIHRvIHRoZSBNYWluIFRocmVhZCAoXCJVSSBUaHJlYWRcIikuXG4gKlxuICogUHJpbWFyaWx5IHVzZWQgZm9yIHRlc3RpbmcuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNoYW5uZWwucHJvdG90eXBlLl9lbnRlcldvcmtlck1vZGUgPSBmdW5jdGlvbiBfZW50ZXJXb3JrZXJNb2RlKCkge1xuICAgIHRoaXMuX3dvcmtlck1vZGUgPSB0cnVlO1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgc2VsZi5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gb25tZXNzYWdlKGV2KSB7XG4gICAgICAgIF90aGlzLm9uTWVzc2FnZShldi5kYXRhKTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogTWVhbnQgdG8gYmUgb3ZlcnJpZGVuIGJ5IGBGYW1vdXNgLlxuICogQXNzaWduZWQgbWV0aG9kIHdpbGwgYmUgaW52b2tlZCBmb3IgZXZlcnkgcmVjZWl2ZWQgbWVzc2FnZS5cbiAqXG4gKiBAdHlwZSB7RnVuY3Rpb259XG4gKiBAb3ZlcnJpZGVcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5DaGFubmVsLnByb3RvdHlwZS5vbk1lc3NhZ2UgPSBudWxsO1xuXG4vKipcbiAqIFNlbmRzIGEgbWVzc2FnZSB0byB0aGUgVUlNYW5hZ2VyLlxuICpcbiAqIEBwYXJhbSAge0FueX0gICAgbWVzc2FnZSBBcmJpdHJhcnkgbWVzc2FnZSBvYmplY3QuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ2hhbm5lbC5wcm90b3R5cGUuc2VuZE1lc3NhZ2UgPSBmdW5jdGlvbiBzZW5kTWVzc2FnZSAobWVzc2FnZSkge1xuICAgIGlmICh0aGlzLl93b3JrZXJNb2RlKSB7XG4gICAgICAgIHNlbGYucG9zdE1lc3NhZ2UobWVzc2FnZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLm9ubWVzc2FnZShtZXNzYWdlKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIE1lYW50IHRvIGJlIG92ZXJyaWRlbiBieSB0aGUgVUlNYW5hZ2VyIHdoZW4gcnVubmluZyBpbiB0aGUgVUkgVGhyZWFkLlxuICogVXNlZCBmb3IgcHJlc2VydmluZyBBUEkgY29tcGF0aWJpbGl0eSB3aXRoIFdlYiBXb3JrZXJzLlxuICogV2hlbiBydW5uaW5nIGluIFdlYiBXb3JrZXIgbW9kZSwgdGhpcyBwcm9wZXJ0eSB3b24ndCBiZSBtdXRhdGVkLlxuICpcbiAqIEFzc2lnbmVkIG1ldGhvZCB3aWxsIGJlIGludm9rZWQgZm9yIGV2ZXJ5IG1lc3NhZ2UgcG9zdGVkIGJ5IGBmYW1vdXMtY29yZWAuXG4gKlxuICogQHR5cGUge0Z1bmN0aW9ufVxuICogQG92ZXJyaWRlXG4gKi9cbkNoYW5uZWwucHJvdG90eXBlLm9ubWVzc2FnZSA9IG51bGw7XG5cbi8qKlxuICogU2VuZHMgYSBtZXNzYWdlIHRvIHRoZSBtYW5hZ2VyIG9mIHRoaXMgY2hhbm5lbCAodGhlIGBGYW1vdXNgIHNpbmdsZXRvbikgYnlcbiAqIGludm9raW5nIGBvbk1lc3NhZ2VgLlxuICogVXNlZCBmb3IgcHJlc2VydmluZyBBUEkgY29tcGF0aWJpbGl0eSB3aXRoIFdlYiBXb3JrZXJzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAYWxpYXMgb25NZXNzYWdlXG4gKlxuICogQHBhcmFtIHtBbnl9IG1lc3NhZ2UgYSBtZXNzYWdlIHRvIHNlbmQgb3ZlciB0aGUgY2hhbm5lbFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNoYW5uZWwucHJvdG90eXBlLnBvc3RNZXNzYWdlID0gZnVuY3Rpb24gcG9zdE1lc3NhZ2UobWVzc2FnZSkge1xuICAgIHJldHVybiB0aGlzLm9uTWVzc2FnZShtZXNzYWdlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhbm5lbDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKiBcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKiBcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqIFxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICogXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogRXF1aXZhbGVudCBvZiBhbiBFbmdpbmUgaW4gdGhlIFdvcmtlciBUaHJlYWQuIFVzZWQgdG8gc3luY2hyb25pemUgYW5kIG1hbmFnZVxuICogdGltZSBhY3Jvc3MgZGlmZmVyZW50IFRocmVhZHMuXG4gKlxuICogQGNsYXNzICBDbG9ja1xuICogQGNvbnN0cnVjdG9yXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBDbG9jayAoKSB7XG4gICAgdGhpcy5fdGltZSA9IDA7XG4gICAgdGhpcy5fZnJhbWUgPSAwO1xuICAgIHRoaXMuX3RpbWVyUXVldWUgPSBbXTtcbiAgICB0aGlzLl91cGRhdGluZ0luZGV4ID0gMDtcblxuICAgIHRoaXMuX3NjYWxlID0gMTtcbiAgICB0aGlzLl9zY2FsZWRUaW1lID0gdGhpcy5fdGltZTtcbn1cblxuLyoqXG4gKiBTZXRzIHRoZSBzY2FsZSBhdCB3aGljaCB0aGUgY2xvY2sgdGltZSBpcyBwYXNzaW5nLlxuICogVXNlZnVsIGZvciBzbG93LW1vdGlvbiBvciBmYXN0LWZvcndhcmQgZWZmZWN0cy5cbiAqIFxuICogYDFgIG1lYW5zIG5vIHRpbWUgc2NhbGluZyAoXCJyZWFsdGltZVwiKSxcbiAqIGAyYCBtZWFucyB0aGUgY2xvY2sgdGltZSBpcyBwYXNzaW5nIHR3aWNlIGFzIGZhc3QsXG4gKiBgMC41YCBtZWFucyB0aGUgY2xvY2sgdGltZSBpcyBwYXNzaW5nIHR3byB0aW1lcyBzbG93ZXIgdGhhbiB0aGUgXCJhY3R1YWxcIlxuICogdGltZSBhdCB3aGljaCB0aGUgQ2xvY2sgaXMgYmVpbmcgdXBkYXRlZCB2aWEgYC5zdGVwYC5cbiAqXG4gKiBJbml0YWxseSB0aGUgY2xvY2sgdGltZSBpcyBub3QgYmVpbmcgc2NhbGVkIChmYWN0b3IgYDFgKS5cbiAqIFxuICogQG1ldGhvZCAgc2V0U2NhbGVcbiAqIEBjaGFpbmFibGVcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IHNjYWxlICAgIFRoZSBzY2FsZSBhdCB3aGljaCB0aGUgY2xvY2sgdGltZSBpcyBwYXNzaW5nLlxuICpcbiAqIEByZXR1cm4ge0Nsb2NrfSB0aGlzXG4gKi9cbkNsb2NrLnByb3RvdHlwZS5zZXRTY2FsZSA9IGZ1bmN0aW9uIHNldFNjYWxlIChzY2FsZSkge1xuICAgIHRoaXMuX3NjYWxlID0gc2NhbGU7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEBtZXRob2QgIGdldFNjYWxlXG4gKiBcbiAqIEByZXR1cm4ge051bWJlcn0gc2NhbGUgICAgVGhlIHNjYWxlIGF0IHdoaWNoIHRoZSBjbG9jayB0aW1lIGlzIHBhc3NpbmcuXG4gKi9cbkNsb2NrLnByb3RvdHlwZS5nZXRTY2FsZSA9IGZ1bmN0aW9uIGdldFNjYWxlICgpIHtcbiAgICByZXR1cm4gdGhpcy5fc2NhbGU7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIGludGVybmFsIGNsb2NrIHRpbWUuXG4gKlxuICogQG1ldGhvZCAgc3RlcFxuICogQGNoYWluYWJsZVxuICogXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHRpbWUgaGlnaCByZXNvbHV0aW9uIHRpbXN0YW1wIHVzZWQgZm9yIGludm9raW5nIHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgIGB1cGRhdGVgIG1ldGhvZCBvbiBhbGwgcmVnaXN0ZXJlZCBvYmplY3RzXG4gKiBAcmV0dXJuIHtDbG9ja30gICAgICAgdGhpc1xuICovXG5DbG9jay5wcm90b3R5cGUuc3RlcCA9IGZ1bmN0aW9uIHN0ZXAgKHRpbWUpIHtcbiAgICB0aGlzLl9mcmFtZSsrO1xuXG4gICAgdGhpcy5fc2NhbGVkVGltZSA9IHRoaXMuX3NjYWxlZFRpbWUgKyAodGltZSAtIHRoaXMuX3RpbWUpKnRoaXMuX3NjYWxlO1xuICAgIHRoaXMuX3RpbWUgPSB0aW1lO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl90aW1lclF1ZXVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0aGlzLl90aW1lclF1ZXVlW2ldKHRoaXMuX3NjYWxlZFRpbWUpKSB7XG4gICAgICAgICAgICB0aGlzLl90aW1lclF1ZXVlLnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgaW50ZXJuYWwgY2xvY2sgdGltZS5cbiAqXG4gKiBAbWV0aG9kICBub3dcbiAqIFxuICogQHJldHVybiAge051bWJlcn0gdGltZSBoaWdoIHJlc29sdXRpb24gdGltc3RhbXAgdXNlZCBmb3IgaW52b2tpbmcgdGhlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgYHVwZGF0ZWAgbWV0aG9kIG9uIGFsbCByZWdpc3RlcmVkIG9iamVjdHNcbiAqL1xuQ2xvY2sucHJvdG90eXBlLm5vdyA9IGZ1bmN0aW9uIG5vdyAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NjYWxlZFRpbWU7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGludGVybmFsIGNsb2NrIHRpbWUuXG4gKlxuICogQG1ldGhvZCAgZ2V0VGltZVxuICogQGRlcHJlY2F0ZWQgVXNlICNub3cgaW5zdGVhZFxuICogXG4gKiBAcmV0dXJuICB7TnVtYmVyfSB0aW1lIGhpZ2ggcmVzb2x1dGlvbiB0aW1zdGFtcCB1c2VkIGZvciBpbnZva2luZyB0aGVcbiAqICAgICAgICAgICAgICAgICAgICAgICBgdXBkYXRlYCBtZXRob2Qgb24gYWxsIHJlZ2lzdGVyZWQgb2JqZWN0c1xuICovXG5DbG9jay5wcm90b3R5cGUuZ2V0VGltZSA9IENsb2NrLnByb3RvdHlwZS5ub3c7XG5cbi8qKlxuICogUmV0dXJucyB0aGUgbnVtYmVyIG9mIGZyYW1lcyBlbGFwc2VkIHNvIGZhci5cbiAqXG4gKiBAbWV0aG9kIGdldEZyYW1lXG4gKiBcbiAqIEByZXR1cm4ge051bWJlcn0gZnJhbWVzXG4gKi9cbkNsb2NrLnByb3RvdHlwZS5nZXRGcmFtZSA9IGZ1bmN0aW9uIGdldEZyYW1lICgpIHtcbiAgICByZXR1cm4gdGhpcy5fZnJhbWU7XG59O1xuXG4vKipcbiAqIFdyYXBzIGEgZnVuY3Rpb24gdG8gYmUgaW52b2tlZCBhZnRlciBhIGNlcnRhaW4gYW1vdW50IG9mIHRpbWUuXG4gKiBBZnRlciBhIHNldCBkdXJhdGlvbiBoYXMgcGFzc2VkLCBpdCBleGVjdXRlcyB0aGUgZnVuY3Rpb24gYW5kXG4gKiByZW1vdmVzIGl0IGFzIGEgbGlzdGVuZXIgdG8gJ3ByZXJlbmRlcicuXG4gKlxuICogQG1ldGhvZCBzZXRUaW1lb3V0XG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgcnVuIGFmdGVyIGEgc3BlY2lmaWVkIGR1cmF0aW9uXG4gKiBAcGFyYW0ge051bWJlcn0gZGVsYXkgbWlsbGlzZWNvbmRzIGZyb20gbm93IHRvIGV4ZWN1dGUgdGhlIGZ1bmN0aW9uXG4gKlxuICogQHJldHVybiB7RnVuY3Rpb259IHRpbWVyIGZ1bmN0aW9uIHVzZWQgZm9yIENsb2NrI2NsZWFyVGltZXJcbiAqL1xuQ2xvY2sucHJvdG90eXBlLnNldFRpbWVvdXQgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIGRlbGF5KSB7XG4gICAgdmFyIHBhcmFtcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIHN0YXJ0ZWRBdCA9IHRoaXMuX3RpbWU7XG4gICAgdmFyIHRpbWVyID0gZnVuY3Rpb24odGltZSkge1xuICAgICAgICBpZiAodGltZSAtIHN0YXJ0ZWRBdCA+PSBkZWxheSkge1xuICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgcGFyYW1zKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIHRoaXMuX3RpbWVyUXVldWUucHVzaCh0aW1lcik7XG4gICAgcmV0dXJuIHRpbWVyO1xufTtcblxuXG4vKipcbiAqIFdyYXBzIGEgZnVuY3Rpb24gdG8gYmUgaW52b2tlZCBhZnRlciBhIGNlcnRhaW4gYW1vdW50IG9mIHRpbWUuXG4gKiAgQWZ0ZXIgYSBzZXQgZHVyYXRpb24gaGFzIHBhc3NlZCwgaXQgZXhlY3V0ZXMgdGhlIGZ1bmN0aW9uIGFuZFxuICogIHJlc2V0cyB0aGUgZXhlY3V0aW9uIHRpbWUuXG4gKlxuICogQG1ldGhvZCBzZXRJbnRlcnZhbFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIHJ1biBhZnRlciBhIHNwZWNpZmllZCBkdXJhdGlvblxuICogQHBhcmFtIHtOdW1iZXJ9IGRlbGF5IGludGVydmFsIHRvIGV4ZWN1dGUgZnVuY3Rpb24gaW4gbWlsbGlzZWNvbmRzXG4gKlxuICogQHJldHVybiB7RnVuY3Rpb259IHRpbWVyIGZ1bmN0aW9uIHVzZWQgZm9yIENsb2NrI2NsZWFyVGltZXJcbiAqL1xuQ2xvY2sucHJvdG90eXBlLnNldEludGVydmFsID0gZnVuY3Rpb24gc2V0SW50ZXJ2YWwoY2FsbGJhY2ssIGRlbGF5KSB7XG4gICAgdmFyIHBhcmFtcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIHN0YXJ0ZWRBdCA9IHRoaXMuX3RpbWU7XG4gICAgdmFyIHRpbWVyID0gZnVuY3Rpb24odGltZSkge1xuICAgICAgICBpZiAodGltZSAtIHN0YXJ0ZWRBdCA+PSBkZWxheSkge1xuICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgcGFyYW1zKTtcbiAgICAgICAgICAgIHN0YXJ0ZWRBdCA9IHRpbWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgdGhpcy5fdGltZXJRdWV1ZS5wdXNoKHRpbWVyKTtcbiAgICByZXR1cm4gdGltZXI7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgcHJldmlvdXNseSB2aWEgYENsb2NrI3NldFRpbWVvdXRgIG9yIGBDbG9jayNzZXRJbnRlcnZhbGBcbiAqIHJlZ2lzdGVyZWQgY2FsbGJhY2sgZnVuY3Rpb25cbiAqXG4gKiBAbWV0aG9kIGNsZWFyVGltZXJcbiAqIEBjaGFpbmFibGVcbiAqIFxuICogQHBhcmFtICB7RnVuY3Rpb259IHRpbWVyICBwcmV2aW91c2x5IGJ5IGBDbG9jayNzZXRUaW1lb3V0YCBvclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgQ2xvY2sjc2V0SW50ZXJ2YWxgIHJldHVybmVkIGNhbGxiYWNrIGZ1bmN0aW9uXG4gKiBAcmV0dXJuIHtDbG9ja30gICAgICAgICAgICAgIHRoaXNcbiAqL1xuQ2xvY2sucHJvdG90eXBlLmNsZWFyVGltZXIgPSBmdW5jdGlvbiAodGltZXIpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl90aW1lclF1ZXVlLmluZGV4T2YodGltZXIpO1xuICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgdGhpcy5fdGltZXJRdWV1ZS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xvY2s7XG5cbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbi8qanNoaW50IC1XMDc5ICovXG5cbid1c2Ugc3RyaWN0JztcblxuLy8gVE9ETzogRGlzcGF0Y2ggc2hvdWxkIGJlIGdlbmVyYWxpemVkIHNvIHRoYXQgaXQgY2FuIHdvcmsgb24gYW55IE5vZGVcbi8vIG5vdCBqdXN0IENvbnRleHRzLlxuXG52YXIgRXZlbnQgPSByZXF1aXJlKCcuL0V2ZW50Jyk7XG5cbi8qKlxuICogVGhlIERpc3BhdGNoIGNsYXNzIGlzIHVzZWQgdG8gcHJvcG9nYXRlIGV2ZW50cyBkb3duIHRoZVxuICogc2NlbmUgZ3JhcGguXG4gKlxuICogQGNsYXNzIERpc3BhdGNoXG4gKiBAcGFyYW0ge1NjZW5lfSBjb250ZXh0IFRoZSBjb250ZXh0IG9uIHdoaWNoIGl0IG9wZXJhdGVzXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRGlzcGF0Y2ggKGNvbnRleHQpIHtcblxuICAgIGlmICghY29udGV4dCkgdGhyb3cgbmV3IEVycm9yKCdEaXNwYXRjaCBuZWVkcyB0byBiZSBpbnN0YW50aWF0ZWQgb24gYSBub2RlJyk7XG5cbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDsgLy8gQSByZWZlcmVuY2UgdG8gdGhlIGNvbnRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb24gd2hpY2ggdGhlIGRpc3BhdGNoZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb3BlcmF0ZXNcblxuICAgIHRoaXMuX3F1ZXVlID0gW107IC8vIFRoZSBxdWV1ZSBpcyB1c2VkIGZvciB0d28gcHVycG9zZXNcbiAgICAgICAgICAgICAgICAgICAgICAvLyAxLiBJdCBpcyB1c2VkIHRvIGxpc3QgaW5kaWNpZXMgaW4gdGhlXG4gICAgICAgICAgICAgICAgICAgICAgLy8gICAgTm9kZXMgcGF0aCB3aGljaCBhcmUgdGhlbiB1c2VkIHRvIGxvb2t1cFxuICAgICAgICAgICAgICAgICAgICAgIC8vICAgIGEgbm9kZSBpbiB0aGUgc2NlbmUgZ3JhcGguXG4gICAgICAgICAgICAgICAgICAgICAgLy8gMi4gSXQgaXMgdXNlZCB0byBhc3Npc3QgZGlzcGF0Y2hpbmdcbiAgICAgICAgICAgICAgICAgICAgICAvLyAgICBzdWNoIHRoYXQgaXQgaXMgcG9zc2libGUgdG8gZG8gYSBicmVhZHRoIGZpcnN0XG4gICAgICAgICAgICAgICAgICAgICAgLy8gICAgdHJhdmVyc2FsIG9mIHRoZSBzY2VuZSBncmFwaC5cbn1cblxuLyoqXG4gKiBsb29rdXBOb2RlIHRha2VzIGEgcGF0aCBhbmQgcmV0dXJucyB0aGUgbm9kZSBhdCB0aGUgbG9jYXRpb24gc3BlY2lmaWVkXG4gKiBieSB0aGUgcGF0aCwgaWYgb25lIGV4aXN0cy4gSWYgbm90LCBpdCByZXR1cm5zIHVuZGVmaW5lZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbG9jYXRpb24gVGhlIGxvY2F0aW9uIG9mIHRoZSBub2RlIHNwZWNpZmllZCBieSBpdHMgcGF0aFxuICpcbiAqIEByZXR1cm4ge05vZGUgfCB1bmRlZmluZWR9IFRoZSBub2RlIGF0IHRoZSByZXF1ZXN0ZWQgcGF0aFxuICovXG5EaXNwYXRjaC5wcm90b3R5cGUubG9va3VwTm9kZSA9IGZ1bmN0aW9uIGxvb2t1cE5vZGUgKGxvY2F0aW9uKSB7XG4gICAgaWYgKCFsb2NhdGlvbikgdGhyb3cgbmV3IEVycm9yKCdsb29rdXBOb2RlIG11c3QgYmUgY2FsbGVkIHdpdGggYSBwYXRoJyk7XG5cbiAgICB2YXIgcGF0aCA9IHRoaXMuX3F1ZXVlO1xuXG4gICAgX3NwbGl0VG8obG9jYXRpb24sIHBhdGgpO1xuXG4gICAgaWYgKHBhdGhbMF0gIT09IHRoaXMuX2NvbnRleHQuZ2V0U2VsZWN0b3IoKSkgcmV0dXJuIHZvaWQgMDtcblxuICAgIHZhciBjaGlsZHJlbiA9IHRoaXMuX2NvbnRleHQuZ2V0Q2hpbGRyZW4oKTtcbiAgICB2YXIgY2hpbGQ7XG4gICAgdmFyIGkgPSAxO1xuICAgIHBhdGhbMF0gPSB0aGlzLl9jb250ZXh0O1xuXG4gICAgd2hpbGUgKGkgPCBwYXRoLmxlbmd0aCkge1xuICAgICAgICBjaGlsZCA9IGNoaWxkcmVuW3BhdGhbaV1dO1xuICAgICAgICBwYXRoW2ldID0gY2hpbGQ7XG4gICAgICAgIGlmIChjaGlsZCkgY2hpbGRyZW4gPSBjaGlsZC5nZXRDaGlsZHJlbigpO1xuICAgICAgICBlbHNlIHJldHVybiB2b2lkIDA7XG4gICAgICAgIGkrKztcbiAgICB9XG5cbiAgICByZXR1cm4gY2hpbGQ7XG59O1xuXG4vKipcbiAqIGRpc3BhdGNoIHRha2VzIGFuIGV2ZW50IG5hbWUgYW5kIGEgcGF5bG9hZCBhbmQgZGlzcGF0Y2hlcyBpdCB0byB0aGVcbiAqIGVudGlyZSBzY2VuZSBncmFwaCBiZWxvdyB0aGUgbm9kZSB0aGF0IHRoZSBkaXNwYXRjaGVyIGlzIG9uLiBUaGUgbm9kZXNcbiAqIHJlY2VpdmUgdGhlIGV2ZW50cyBpbiBhIGJyZWFkdGggZmlyc3QgdHJhdmVyc2FsLCBtZWFuaW5nIHRoYXQgcGFyZW50c1xuICogaGF2ZSB0aGUgb3Bwb3J0dW5pdHkgdG8gcmVhY3QgdG8gdGhlIGV2ZW50IGJlZm9yZSBjaGlsZHJlbi5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgbmFtZSBvZiB0aGUgZXZlbnRcbiAqIEBwYXJhbSB7QW55fSBwYXlsb2FkIHRoZSBldmVudCBwYXlsb2FkXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRGlzcGF0Y2gucHJvdG90eXBlLmRpc3BhdGNoID0gZnVuY3Rpb24gZGlzcGF0Y2ggKGV2ZW50LCBwYXlsb2FkKSB7XG4gICAgaWYgKCFldmVudCkgdGhyb3cgbmV3IEVycm9yKCdkaXNwYXRjaCByZXF1aXJlcyBhbiBldmVudCBuYW1lIGFzIGl0XFwncyBmaXJzdCBhcmd1bWVudCcpO1xuXG4gICAgdmFyIHF1ZXVlID0gdGhpcy5fcXVldWU7XG4gICAgdmFyIGl0ZW07XG4gICAgdmFyIGk7XG4gICAgdmFyIGxlbjtcbiAgICB2YXIgY2hpbGRyZW47XG5cbiAgICBxdWV1ZS5sZW5ndGggPSAwO1xuICAgIHF1ZXVlLnB1c2godGhpcy5fY29udGV4dCk7XG5cbiAgICB3aGlsZSAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGl0ZW0gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICBpZiAoaXRlbS5vblJlY2VpdmUpIGl0ZW0ub25SZWNlaXZlKGV2ZW50LCBwYXlsb2FkKTtcbiAgICAgICAgY2hpbGRyZW4gPSBpdGVtLmdldENoaWxkcmVuKCk7XG4gICAgICAgIGZvciAoaSA9IDAsIGxlbiA9IGNoaWxkcmVuLmxlbmd0aCA7IGkgPCBsZW4gOyBpKyspIHF1ZXVlLnB1c2goY2hpbGRyZW5baV0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogZGlzcGF0Y2hVSWV2ZW50IHRha2VzIGEgcGF0aCwgYW4gZXZlbnQgbmFtZSwgYW5kIGEgcGF5bG9hZCBhbmQgZGlzcGF0Y2hlcyB0aGVtIGluXG4gKiBhIG1hbm5lciBhbm9sb2dvdXMgdG8gRE9NIGJ1YmJsaW5nLiBJdCBmaXJzdCB0cmF2ZXJzZXMgZG93biB0byB0aGUgbm9kZSBzcGVjaWZpZWQgYXRcbiAqIHRoZSBwYXRoLiBUaGF0IG5vZGUgcmVjZWl2ZXMgdGhlIGV2ZW50IGZpcnN0LCBhbmQgdGhlbiBldmVyeSBhbmNlc3RvciByZWNlaXZlcyB0aGUgZXZlbnRcbiAqIHVudGlsIHRoZSBjb250ZXh0LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBwYXRoIG9mIHRoZSBub2RlXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgdGhlIGV2ZW50IG5hbWVcbiAqIEBwYXJhbSB7QW55fSBwYXlsb2FkIHRoZSBwYXlsb2FkXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRGlzcGF0Y2gucHJvdG90eXBlLmRpc3BhdGNoVUlFdmVudCA9IGZ1bmN0aW9uIGRpc3BhdGNoVUlFdmVudCAocGF0aCwgZXZlbnQsIHBheWxvYWQpIHtcbiAgICBpZiAoIXBhdGgpIHRocm93IG5ldyBFcnJvcignZGlzcGF0Y2hVSUV2ZW50IG5lZWRzIGEgdmFsaWQgcGF0aCB0byBkaXNwYXRjaCB0bycpO1xuICAgIGlmICghZXZlbnQpIHRocm93IG5ldyBFcnJvcignZGlzcGF0Y2hVSUV2ZW50IG5lZWRzIGFuIGV2ZW50IG5hbWUgYXMgaXRzIHNlY29uZCBhcmd1bWVudCcpO1xuXG4gICAgdmFyIHF1ZXVlID0gdGhpcy5fcXVldWU7XG4gICAgdmFyIG5vZGU7XG5cbiAgICBFdmVudC5jYWxsKHBheWxvYWQpO1xuICAgIHBheWxvYWQubm9kZSA9IHRoaXMubG9va3VwTm9kZShwYXRoKTsgLy8gQWZ0ZXIgdGhpcyBjYWxsLCB0aGUgcGF0aCBpcyBsb2FkZWQgaW50byB0aGUgcXVldWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIChsb29rVXAgbm9kZSBkb2Vzbid0IGNsZWFyIHRoZSBxdWV1ZSBhZnRlciB0aGUgbG9va3VwKVxuXG4gICAgd2hpbGUgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBub2RlID0gcXVldWUucG9wKCk7IC8vIHBvcCBub2RlcyBvZmYgb2YgdGhlIHF1ZXVlIHRvIG1vdmUgdXAgdGhlIGFuY2VzdG9yIGNoYWluLlxuICAgICAgICBpZiAobm9kZS5vblJlY2VpdmUpIG5vZGUub25SZWNlaXZlKGV2ZW50LCBwYXlsb2FkKTtcbiAgICAgICAgaWYgKHBheWxvYWQucHJvcGFnYXRpb25TdG9wcGVkKSBicmVhaztcbiAgICB9XG59O1xuXG4vKipcbiAqIF9zcGxpdFRvIGlzIGEgcHJpdmF0ZSBtZXRob2Qgd2hpY2ggdGFrZXMgYSBwYXRoIGFuZCBzcGxpdHMgaXQgYXQgZXZlcnkgJy8nXG4gKiBwdXNoaW5nIHRoZSByZXN1bHQgaW50byB0aGUgc3VwcGxpZWQgYXJyYXkuIFRoaXMgaXMgYSBkZXN0cnVjdGl2ZSBjaGFuZ2UuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmcgdGhlIHNwZWNpZmllZCBwYXRoXG4gKiBAcGFyYW0ge0FycmF5fSB0YXJnZXQgdGhlIGFycmF5IHRvIHdoaWNoIHRoZSByZXN1bHQgc2hvdWxkIGJlIHdyaXR0ZW5cbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gdGhlIHRhcmdldCBhZnRlciBoYXZpbmcgYmVlbiB3cml0dGVuIHRvXG4gKi9cbmZ1bmN0aW9uIF9zcGxpdFRvIChzdHJpbmcsIHRhcmdldCkge1xuICAgIHRhcmdldC5sZW5ndGggPSAwOyAvLyBjbGVhcnMgdGhlIGFycmF5IGZpcnN0LlxuICAgIHZhciBsYXN0ID0gMDtcbiAgICB2YXIgaTtcbiAgICB2YXIgbGVuID0gc3RyaW5nLmxlbmd0aDtcblxuICAgIGZvciAoaSA9IDAgOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgIGlmIChzdHJpbmdbaV0gPT09ICcvJykge1xuICAgICAgICAgICAgdGFyZ2V0LnB1c2goc3RyaW5nLnN1YnN0cmluZyhsYXN0LCBpKSk7XG4gICAgICAgICAgICBsYXN0ID0gaSArIDE7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaSAtIGxhc3QgPiAwKSB0YXJnZXQucHVzaChzdHJpbmcuc3Vic3RyaW5nKGxhc3QsIGkpKTtcblxuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRGlzcGF0Y2g7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICogXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICogXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKiBcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqIFxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoZSBFdmVudCBjbGFzcyBhZGRzIHRoZSBzdG9wUHJvcGFnYXRpb24gZnVuY3Rpb25hbGl0eVxuICogdG8gdGhlIFVJRXZlbnRzIHdpdGhpbiB0aGUgc2NlbmUgZ3JhcGguXG4gKlxuICogQGNvbnN0cnVjdG9yIEV2ZW50XG4gKi9cbmZ1bmN0aW9uIEV2ZW50ICgpIHtcbiAgICB0aGlzLnByb3BhZ2F0aW9uU3RvcHBlZCA9IGZhbHNlO1xuICAgIHRoaXMuc3RvcFByb3BhZ2F0aW9uID0gc3RvcFByb3BhZ2F0aW9uO1xufVxuXG4vKipcbiAqIHN0b3BQcm9wYWdhdGlvbiBlbmRzIHRoZSBidWJibGluZyBvZiB0aGUgZXZlbnQgaW4gdGhlXG4gKiBzY2VuZSBncmFwaC5cbiAqXG4gKiBAbWV0aG9kIHN0b3BQcm9wYWdhdGlvblxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbmZ1bmN0aW9uIHN0b3BQcm9wYWdhdGlvbiAoKSB7XG4gICAgdGhpcy5wcm9wYWdhdGlvblN0b3BwZWQgPSB0cnVlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50O1xuXG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICogXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICogXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKiBcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqIFxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ2xvY2sgPSByZXF1aXJlKCcuL0Nsb2NrJyk7XG52YXIgU2NlbmUgPSByZXF1aXJlKCcuL1NjZW5lJyk7XG52YXIgQ2hhbm5lbCA9IHJlcXVpcmUoJy4vQ2hhbm5lbCcpO1xudmFyIFVJTWFuYWdlciA9IHJlcXVpcmUoJy4uL3JlbmRlcmVycy9VSU1hbmFnZXInKTtcbnZhciBDb21wb3NpdG9yID0gcmVxdWlyZSgnLi4vcmVuZGVyZXJzL0NvbXBvc2l0b3InKTtcbnZhciBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wID0gcmVxdWlyZSgnLi4vcmVuZGVyLWxvb3BzL1JlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AnKTtcblxudmFyIEVOR0lORV9TVEFSVCA9IFsnRU5HSU5FJywgJ1NUQVJUJ107XG52YXIgRU5HSU5FX1NUT1AgPSBbJ0VOR0lORScsICdTVE9QJ107XG52YXIgVElNRV9VUERBVEUgPSBbJ1RJTUUnLCBudWxsXTtcblxuLyoqXG4gKiBGYW1vdXMgaGFzIHR3byByZXNwb25zaWJpbGl0aWVzLCBvbmUgdG8gYWN0IGFzIHRoZSBoaWdoZXN0IGxldmVsXG4gKiB1cGRhdGVyIGFuZCBhbm90aGVyIHRvIHNlbmQgbWVzc2FnZXMgb3ZlciB0byB0aGUgcmVuZGVyZXJzLiBJdCBpc1xuICogYSBzaW5nbGV0b24uXG4gKlxuICogQGNsYXNzIEZhbW91c0VuZ2luZVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEZhbW91c0VuZ2luZSgpIHtcbiAgICB0aGlzLl91cGRhdGVRdWV1ZSA9IFtdOyAvLyBUaGUgdXBkYXRlUXVldWUgaXMgYSBwbGFjZSB3aGVyZSBub2Rlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNhbiBwbGFjZSB0aGVtc2VsdmVzIGluIG9yZGVyIHRvIGJlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlZCBvbiB0aGUgZnJhbWUuXG5cbiAgICB0aGlzLl9uZXh0VXBkYXRlUXVldWUgPSBbXTsgLy8gdGhlIG5leHRVcGRhdGVRdWV1ZSBpcyB1c2VkIHRvIHF1ZXVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZXMgZm9yIHRoZSBuZXh0IHRpY2suXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgcHJldmVudHMgaW5maW5pdGUgbG9vcHMgd2hlcmUgZHVyaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFuIHVwZGF0ZSBhIG5vZGUgY29udGludW91c2x5IHB1dHMgaXRzZWxmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJhY2sgaW4gdGhlIHVwZGF0ZSBxdWV1ZS5cblxuICAgIHRoaXMuX3NjZW5lcyA9IHt9OyAvLyBhIGhhc2ggb2YgYWxsIG9mIHRoZSBzY2VuZXMncyB0aGF0IHRoZSBGYW1vdXNFbmdpbmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpcyByZXNwb25zaWJsZSBmb3IuXG5cbiAgICB0aGlzLl9tZXNzYWdlcyA9IFRJTUVfVVBEQVRFOyAgIC8vIGEgcXVldWUgb2YgYWxsIG9mIHRoZSBkcmF3IGNvbW1hbmRzIHRvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzZW5kIHRvIHRoZSB0aGUgcmVuZGVyZXJzIHRoaXMgZnJhbWUuXG5cbiAgICB0aGlzLl9pblVwZGF0ZSA9IGZhbHNlOyAvLyB3aGVuIHRoZSBmYW1vdXMgaXMgdXBkYXRpbmcgdGhpcyBpcyB0cnVlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFsbCByZXF1ZXN0cyBmb3IgdXBkYXRlcyB3aWxsIGdldCBwdXQgaW4gdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmV4dFVwZGF0ZVF1ZXVlXG5cbiAgICB0aGlzLl9jbG9jayA9IG5ldyBDbG9jaygpOyAvLyBhIGNsb2NrIHRvIGtlZXAgdHJhY2sgb2YgdGltZSBmb3IgdGhlIHNjZW5lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ3JhcGguXG5cbiAgICB0aGlzLl9jaGFubmVsID0gbmV3IENoYW5uZWwoKTtcbiAgICB0aGlzLl9jaGFubmVsLm9uTWVzc2FnZSA9IHRoaXMuaGFuZGxlTWVzc2FnZS5iaW5kKHRoaXMpO1xufVxuXG5cbi8qKlxuICogQW4gaW5pdCBzY3JpcHQgdGhhdCBpbml0aWFsaXplcyB0aGUgRmFtb3VzRW5naW5lIHdpdGggb3B0aW9uc1xuICogb3IgZGVmYXVsdCBwYXJhbWV0ZXJzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBhIHNldCBvZiBvcHRpb25zIGNvbnRhaW5pbmcgYSBjb21wb3NpdG9yIGFuZCBhIHJlbmRlciBsb29wXG4gKlxuICogQHJldHVybiB7RmFtb3VzRW5naW5lfSB0aGlzXG4gKi9cbkZhbW91c0VuZ2luZS5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uIGluaXQob3B0aW9ucykge1xuICAgIHRoaXMuY29tcG9zaXRvciA9IG9wdGlvbnMgJiYgb3B0aW9ucy5jb21wb3NpdG9yIHx8IG5ldyBDb21wb3NpdG9yKCk7XG4gICAgdGhpcy5yZW5kZXJMb29wID0gb3B0aW9ucyAmJiBvcHRpb25zLnJlbmRlckxvb3AgfHwgbmV3IFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AoKTtcbiAgICB0aGlzLnVpTWFuYWdlciA9IG5ldyBVSU1hbmFnZXIodGhpcy5nZXRDaGFubmVsKCksIHRoaXMuY29tcG9zaXRvciwgdGhpcy5yZW5kZXJMb29wKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgY2hhbm5lbCB0aGF0IHRoZSBlbmdpbmUgd2lsbCB1c2UgdG8gY29tbXVuaWNhdGUgdG9cbiAqIHRoZSByZW5kZXJlcnMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7Q2hhbm5lbH0gY2hhbm5lbCAgICAgVGhlIGNoYW5uZWwgdG8gYmUgdXNlZCBmb3IgY29tbXVuaWNhdGluZyB3aXRoXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBgVUlNYW5hZ2VyYC8gYENvbXBvc2l0b3JgLlxuICpcbiAqIEByZXR1cm4ge0ZhbW91c0VuZ2luZX0gdGhpc1xuICovXG5GYW1vdXNFbmdpbmUucHJvdG90eXBlLnNldENoYW5uZWwgPSBmdW5jdGlvbiBzZXRDaGFubmVsKGNoYW5uZWwpIHtcbiAgICB0aGlzLl9jaGFubmVsID0gY2hhbm5lbDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgY2hhbm5lbCB0aGF0IHRoZSBlbmdpbmUgaXMgY3VycmVudGx5IHVzaW5nXG4gKiB0byBjb21tdW5pY2F0ZSB3aXRoIHRoZSByZW5kZXJlcnMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0NoYW5uZWx9IGNoYW5uZWwgICAgVGhlIGNoYW5uZWwgdG8gYmUgdXNlZCBmb3IgY29tbXVuaWNhdGluZyB3aXRoXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBgVUlNYW5hZ2VyYC8gYENvbXBvc2l0b3JgLlxuICovXG5GYW1vdXNFbmdpbmUucHJvdG90eXBlLmdldENoYW5uZWwgPSBmdW5jdGlvbiBnZXRDaGFubmVsICgpIHtcbiAgICByZXR1cm4gdGhpcy5fY2hhbm5lbDtcbn07XG5cbi8qKlxuICogX3VwZGF0ZSBpcyB0aGUgYm9keSBvZiB0aGUgdXBkYXRlIGxvb3AuIFRoZSBmcmFtZSBjb25zaXN0cyBvZlxuICogcHVsbGluZyBpbiBhcHBlbmRpbmcgdGhlIG5leHRVcGRhdGVRdWV1ZSB0byB0aGUgY3VycmVudFVwZGF0ZSBxdWV1ZVxuICogdGhlbiBtb3ZpbmcgdGhyb3VnaCB0aGUgdXBkYXRlUXVldWUgYW5kIGNhbGxpbmcgb25VcGRhdGUgd2l0aCB0aGUgY3VycmVudFxuICogdGltZSBvbiBhbGwgbm9kZXMuIFdoaWxlIF91cGRhdGUgaXMgY2FsbGVkIF9pblVwZGF0ZSBpcyBzZXQgdG8gdHJ1ZSBhbmRcbiAqIGFsbCByZXF1ZXN0cyB0byBiZSBwbGFjZWQgaW4gdGhlIHVwZGF0ZSBxdWV1ZSB3aWxsIGJlIGZvcndhcmRlZCB0byB0aGVcbiAqIG5leHRVcGRhdGVRdWV1ZS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRmFtb3VzRW5naW5lLnByb3RvdHlwZS5fdXBkYXRlID0gZnVuY3Rpb24gX3VwZGF0ZSAoKSB7XG4gICAgdGhpcy5faW5VcGRhdGUgPSB0cnVlO1xuICAgIHZhciB0aW1lID0gdGhpcy5fY2xvY2subm93KCk7XG4gICAgdmFyIG5leHRRdWV1ZSA9IHRoaXMuX25leHRVcGRhdGVRdWV1ZTtcbiAgICB2YXIgcXVldWUgPSB0aGlzLl91cGRhdGVRdWV1ZTtcbiAgICB2YXIgaXRlbTtcblxuICAgIHRoaXMuX21lc3NhZ2VzWzFdID0gdGltZTtcblxuICAgIHdoaWxlIChuZXh0UXVldWUubGVuZ3RoKSBxdWV1ZS51bnNoaWZ0KG5leHRRdWV1ZS5wb3AoKSk7XG5cbiAgICB3aGlsZSAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGl0ZW0gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uVXBkYXRlKSBpdGVtLm9uVXBkYXRlKHRpbWUpO1xuICAgIH1cblxuICAgIHRoaXMuX2luVXBkYXRlID0gZmFsc2U7XG59O1xuXG4vKipcbiAqIHJlcXVlc3RVcGRhdGVzIHRha2VzIGEgY2xhc3MgdGhhdCBoYXMgYW4gb25VcGRhdGUgbWV0aG9kIGFuZCBwdXRzIGl0XG4gKiBpbnRvIHRoZSB1cGRhdGVRdWV1ZSB0byBiZSB1cGRhdGVkIGF0IHRoZSBuZXh0IGZyYW1lLlxuICogSWYgRmFtb3VzRW5naW5lIGlzIGN1cnJlbnRseSBpbiBhbiB1cGRhdGUsIHJlcXVlc3RVcGRhdGVcbiAqIHBhc3NlcyBpdHMgYXJndW1lbnQgdG8gcmVxdWVzdFVwZGF0ZU9uTmV4dFRpY2suXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSByZXF1ZXN0ZXIgYW4gb2JqZWN0IHdpdGggYW4gb25VcGRhdGUgbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRmFtb3VzRW5naW5lLnByb3RvdHlwZS5yZXF1ZXN0VXBkYXRlID0gZnVuY3Rpb24gcmVxdWVzdFVwZGF0ZSAocmVxdWVzdGVyKSB7XG4gICAgaWYgKCFyZXF1ZXN0ZXIpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICdyZXF1ZXN0VXBkYXRlIG11c3QgYmUgY2FsbGVkIHdpdGggYSBjbGFzcyB0byBiZSB1cGRhdGVkJ1xuICAgICAgICApO1xuXG4gICAgaWYgKHRoaXMuX2luVXBkYXRlKSB0aGlzLnJlcXVlc3RVcGRhdGVPbk5leHRUaWNrKHJlcXVlc3Rlcik7XG4gICAgZWxzZSB0aGlzLl91cGRhdGVRdWV1ZS5wdXNoKHJlcXVlc3Rlcik7XG59O1xuXG4vKipcbiAqIHJlcXVlc3RVcGRhdGVPbk5leHRUaWNrIGlzIHJlcXVlc3RzIGFuIHVwZGF0ZSBvbiB0aGUgbmV4dCBmcmFtZS5cbiAqIElmIEZhbW91c0VuZ2luZSBpcyBub3QgY3VycmVudGx5IGluIGFuIHVwZGF0ZSB0aGFuIGl0IGlzIGZ1bmN0aW9uYWxseSBlcXVpdmFsZW50XG4gKiB0byByZXF1ZXN0VXBkYXRlLiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgdXNlZCB0byBwcmV2ZW50IGluZmluaXRlIGxvb3BzIHdoZXJlXG4gKiBhIGNsYXNzIGlzIHVwZGF0ZWQgb24gdGhlIGZyYW1lIGJ1dCBuZWVkcyB0byBiZSB1cGRhdGVkIGFnYWluIG5leHQgZnJhbWUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSByZXF1ZXN0ZXIgYW4gb2JqZWN0IHdpdGggYW4gb25VcGRhdGUgbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRmFtb3VzRW5naW5lLnByb3RvdHlwZS5yZXF1ZXN0VXBkYXRlT25OZXh0VGljayA9IGZ1bmN0aW9uIHJlcXVlc3RVcGRhdGVPbk5leHRUaWNrIChyZXF1ZXN0ZXIpIHtcbiAgICB0aGlzLl9uZXh0VXBkYXRlUXVldWUucHVzaChyZXF1ZXN0ZXIpO1xufTtcblxuLyoqXG4gKiBwb3N0TWVzc2FnZSBzZW5kcyBhIG1lc3NhZ2UgcXVldWUgaW50byBGYW1vdXNFbmdpbmUgdG8gYmUgcHJvY2Vzc2VkLlxuICogVGhlc2UgbWVzc2FnZXMgd2lsbCBiZSBpbnRlcnByZXRlZCBhbmQgc2VudCBpbnRvIHRoZSBzY2VuZSBncmFwaFxuICogYXMgZXZlbnRzIGlmIG5lY2Vzc2FyeS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gbWVzc2FnZXMgYW4gYXJyYXkgb2YgY29tbWFuZHMuXG4gKlxuICogQHJldHVybiB7RmFtb3VzRW5naW5lfSB0aGlzXG4gKi9cbkZhbW91c0VuZ2luZS5wcm90b3R5cGUuaGFuZGxlTWVzc2FnZSA9IGZ1bmN0aW9uIGhhbmRsZU1lc3NhZ2UgKG1lc3NhZ2VzKSB7XG4gICAgaWYgKCFtZXNzYWdlcylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgJ29uTWVzc2FnZSBtdXN0IGJlIGNhbGxlZCB3aXRoIGFuIGFycmF5IG9mIG1lc3NhZ2VzJ1xuICAgICAgICApO1xuXG4gICAgdmFyIGNvbW1hbmQ7XG5cbiAgICB3aGlsZSAobWVzc2FnZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBjb21tYW5kID0gbWVzc2FnZXMuc2hpZnQoKTtcbiAgICAgICAgc3dpdGNoIChjb21tYW5kKSB7XG4gICAgICAgICAgICBjYXNlICdXSVRIJzpcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVdpdGgobWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnRlJBTUUnOlxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRnJhbWUobWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlY2VpdmVkIHVua25vd24gY29tbWFuZDogJyArIGNvbW1hbmQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBoYW5kbGVXaXRoIGlzIGEgbWV0aG9kIHRoYXQgdGFrZXMgYW4gYXJyYXkgb2YgbWVzc2FnZXMgZm9sbG93aW5nIHRoZVxuICogV0lUSCBjb21tYW5kLiBJdCdsbCB0aGVuIGlzc3VlIHRoZSBuZXh0IGNvbW1hbmRzIHRvIHRoZSBwYXRoIHNwZWNpZmllZFxuICogYnkgdGhlIFdJVEggY29tbWFuZC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gbWVzc2FnZXMgYXJyYXkgb2YgbWVzc2FnZXMuXG4gKlxuICogQHJldHVybiB7RmFtb3VzRW5naW5lfSB0aGlzXG4gKi9cbkZhbW91c0VuZ2luZS5wcm90b3R5cGUuaGFuZGxlV2l0aCA9IGZ1bmN0aW9uIGhhbmRsZVdpdGggKG1lc3NhZ2VzKSB7XG4gICAgdmFyIHBhdGggPSBtZXNzYWdlcy5zaGlmdCgpO1xuICAgIHZhciBjb21tYW5kID0gbWVzc2FnZXMuc2hpZnQoKTtcblxuICAgIHN3aXRjaCAoY29tbWFuZCkge1xuICAgICAgICBjYXNlICdUUklHR0VSJzogLy8gdGhlIFRSSUdHRVIgY29tbWFuZCBzZW5kcyBhIFVJRXZlbnQgdG8gdGhlIHNwZWNpZmllZCBwYXRoXG4gICAgICAgICAgICB2YXIgdHlwZSA9IG1lc3NhZ2VzLnNoaWZ0KCk7XG4gICAgICAgICAgICB2YXIgZXYgPSBtZXNzYWdlcy5zaGlmdCgpO1xuXG4gICAgICAgICAgICB0aGlzLmdldENvbnRleHQocGF0aCkuZ2V0RGlzcGF0Y2goKS5kaXNwYXRjaFVJRXZlbnQocGF0aCwgdHlwZSwgZXYpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlY2VpdmVkIHVua25vd24gY29tbWFuZDogJyArIGNvbW1hbmQpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogaGFuZGxlRnJhbWUgaXMgY2FsbGVkIHdoZW4gdGhlIHJlbmRlcmVycyBpc3N1ZSBhIEZSQU1FIGNvbW1hbmQgdG9cbiAqIEZhbW91c0VuZ2luZS4gRmFtb3VzRW5naW5lIHdpbGwgdGhlbiBzdGVwIHVwZGF0aW5nIHRoZSBzY2VuZSBncmFwaCB0byB0aGUgY3VycmVudCB0aW1lLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBtZXNzYWdlcyBhcnJheSBvZiBtZXNzYWdlcy5cbiAqXG4gKiBAcmV0dXJuIHtGYW1vdXNFbmdpbmV9IHRoaXNcbiAqL1xuRmFtb3VzRW5naW5lLnByb3RvdHlwZS5oYW5kbGVGcmFtZSA9IGZ1bmN0aW9uIGhhbmRsZUZyYW1lIChtZXNzYWdlcykge1xuICAgIGlmICghbWVzc2FnZXMpIHRocm93IG5ldyBFcnJvcignaGFuZGxlRnJhbWUgbXVzdCBiZSBjYWxsZWQgd2l0aCBhbiBhcnJheSBvZiBtZXNzYWdlcycpO1xuICAgIGlmICghbWVzc2FnZXMubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoJ0ZSQU1FIG11c3QgYmUgc2VudCB3aXRoIGEgdGltZScpO1xuXG4gICAgdGhpcy5zdGVwKG1lc3NhZ2VzLnNoaWZ0KCkpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBzdGVwIHVwZGF0ZXMgdGhlIGNsb2NrIGFuZCB0aGUgc2NlbmUgZ3JhcGggYW5kIHRoZW4gc2VuZHMgdGhlIGRyYXcgY29tbWFuZHNcbiAqIHRoYXQgYWNjdW11bGF0ZWQgaW4gdGhlIHVwZGF0ZSB0byB0aGUgcmVuZGVyZXJzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdGltZSBjdXJyZW50IGVuZ2luZSB0aW1lXG4gKlxuICogQHJldHVybiB7RmFtb3VzRW5naW5lfSB0aGlzXG4gKi9cbkZhbW91c0VuZ2luZS5wcm90b3R5cGUuc3RlcCA9IGZ1bmN0aW9uIHN0ZXAgKHRpbWUpIHtcbiAgICBpZiAodGltZSA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoJ3N0ZXAgbXVzdCBiZSBjYWxsZWQgd2l0aCBhIHRpbWUnKTtcblxuICAgIHRoaXMuX2Nsb2NrLnN0ZXAodGltZSk7XG4gICAgdGhpcy5fdXBkYXRlKCk7XG5cbiAgICBpZiAodGhpcy5fbWVzc2FnZXMubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuX2NoYW5uZWwuc2VuZE1lc3NhZ2UodGhpcy5fbWVzc2FnZXMpO1xuICAgICAgICB0aGlzLl9tZXNzYWdlcy5sZW5ndGggPSAyO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiByZXR1cm5zIHRoZSBjb250ZXh0IG9mIGEgcGFydGljdWxhciBwYXRoLiBUaGUgY29udGV4dCBpcyBsb29rZWQgdXAgYnkgdGhlIHNlbGVjdG9yXG4gKiBwb3J0aW9uIG9mIHRoZSBwYXRoIGFuZCBpcyBsaXN0ZWQgZnJvbSB0aGUgc3RhcnQgb2YgdGhlIHN0cmluZyB0byB0aGUgZmlyc3RcbiAqICcvJy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yIHRoZSBwYXRoIHRvIGxvb2sgdXAgdGhlIGNvbnRleHQgZm9yLlxuICpcbiAqIEByZXR1cm4ge0NvbnRleHQgfCBVbmRlZmluZWR9IHRoZSBjb250ZXh0IGlmIGZvdW5kLCBlbHNlIHVuZGVmaW5lZC5cbiAqL1xuRmFtb3VzRW5naW5lLnByb3RvdHlwZS5nZXRDb250ZXh0ID0gZnVuY3Rpb24gZ2V0Q29udGV4dCAoc2VsZWN0b3IpIHtcbiAgICBpZiAoIXNlbGVjdG9yKSB0aHJvdyBuZXcgRXJyb3IoJ2dldENvbnRleHQgbXVzdCBiZSBjYWxsZWQgd2l0aCBhIHNlbGVjdG9yJyk7XG5cbiAgICB2YXIgaW5kZXggPSBzZWxlY3Rvci5pbmRleE9mKCcvJyk7XG4gICAgc2VsZWN0b3IgPSBpbmRleCA9PT0gLTEgPyBzZWxlY3RvciA6IHNlbGVjdG9yLnN1YnN0cmluZygwLCBpbmRleCk7XG5cbiAgICByZXR1cm4gdGhpcy5fc2NlbmVzW3NlbGVjdG9yXTtcbn07XG5cbi8qKlxuICogcmV0dXJucyB0aGUgaW5zdGFuY2Ugb2YgY2xvY2sgd2l0aGluIGZhbW91cy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7Q2xvY2t9IEZhbW91c0VuZ2luZSdzIGNsb2NrXG4gKi9cbkZhbW91c0VuZ2luZS5wcm90b3R5cGUuZ2V0Q2xvY2sgPSBmdW5jdGlvbiBnZXRDbG9jayAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2Nsb2NrO1xufTtcblxuLyoqXG4gKiBxdWV1ZXMgYSBtZXNzYWdlIHRvIGJlIHRyYW5zZmVyZWQgdG8gdGhlIHJlbmRlcmVycy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBbnl9IGNvbW1hbmQgRHJhdyBDb21tYW5kXG4gKlxuICogQHJldHVybiB7RmFtb3VzRW5naW5lfSB0aGlzXG4gKi9cbkZhbW91c0VuZ2luZS5wcm90b3R5cGUubWVzc2FnZSA9IGZ1bmN0aW9uIG1lc3NhZ2UgKGNvbW1hbmQpIHtcbiAgICB0aGlzLl9tZXNzYWdlcy5wdXNoKGNvbW1hbmQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgc2NlbmUgdW5kZXIgd2hpY2ggYSBzY2VuZSBncmFwaCBjb3VsZCBiZSBidWlsdC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yIGEgZG9tIHNlbGVjdG9yIGZvciB3aGVyZSB0aGUgc2NlbmUgc2hvdWxkIGJlIHBsYWNlZFxuICpcbiAqIEByZXR1cm4ge1NjZW5lfSBhIG5ldyBpbnN0YW5jZSBvZiBTY2VuZS5cbiAqL1xuRmFtb3VzRW5naW5lLnByb3RvdHlwZS5jcmVhdGVTY2VuZSA9IGZ1bmN0aW9uIGNyZWF0ZVNjZW5lIChzZWxlY3Rvcikge1xuICAgIHNlbGVjdG9yID0gc2VsZWN0b3IgfHwgJ2JvZHknO1xuXG4gICAgaWYgKHRoaXMuX3NjZW5lc1tzZWxlY3Rvcl0pIHRoaXMuX3NjZW5lc1tzZWxlY3Rvcl0uZGlzbW91bnQoKTtcbiAgICB0aGlzLl9zY2VuZXNbc2VsZWN0b3JdID0gbmV3IFNjZW5lKHNlbGVjdG9yLCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcy5fc2NlbmVzW3NlbGVjdG9yXTtcbn07XG5cbi8qKlxuICogU3RhcnRzIHRoZSBlbmdpbmUgcnVubmluZyBpbiB0aGUgTWFpbi1UaHJlYWQuXG4gKiBUaGlzIGVmZmVjdHMgKipldmVyeSoqIHVwZGF0ZWFibGUgbWFuYWdlZCBieSB0aGUgRW5naW5lLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtGYW1vdXNFbmdpbmV9IHRoaXNcbiAqL1xuRmFtb3VzRW5naW5lLnByb3RvdHlwZS5zdGFydEVuZ2luZSA9IGZ1bmN0aW9uIHN0YXJ0RW5naW5lICgpIHtcbiAgICB0aGlzLl9jaGFubmVsLnNlbmRNZXNzYWdlKEVOR0lORV9TVEFSVCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFN0b3BzIHRoZSBlbmdpbmUgcnVubmluZyBpbiB0aGUgTWFpbi1UaHJlYWQuXG4gKiBUaGlzIGVmZmVjdHMgKipldmVyeSoqIHVwZGF0ZWFibGUgbWFuYWdlZCBieSB0aGUgRW5naW5lLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtGYW1vdXNFbmdpbmV9IHRoaXNcbiAqL1xuRmFtb3VzRW5naW5lLnByb3RvdHlwZS5zdG9wRW5naW5lID0gZnVuY3Rpb24gc3RvcEVuZ2luZSAoKSB7XG4gICAgdGhpcy5fY2hhbm5lbC5zZW5kTWVzc2FnZShFTkdJTkVfU1RPUCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBGYW1vdXNFbmdpbmUoKTtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbi8qanNoaW50IC1XMDc5ICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vVHJhbnNmb3JtJyk7XG52YXIgU2l6ZSA9IHJlcXVpcmUoJy4vU2l6ZScpO1xuXG52YXIgVFJBTlNGT1JNX1BST0NFU1NPUiA9IG5ldyBUcmFuc2Zvcm0oKTtcbnZhciBTSVpFX1BST0NFU1NPUiA9IG5ldyBTaXplKCk7XG5cbnZhciBJREVOVCA9IFtcbiAgICAxLCAwLCAwLCAwLFxuICAgIDAsIDEsIDAsIDAsXG4gICAgMCwgMCwgMSwgMCxcbiAgICAwLCAwLCAwLCAxXG5dO1xuXG52YXIgT05FUyA9IFsxLCAxLCAxXTtcbnZhciBRVUFUID0gWzAsIDAsIDAsIDFdO1xuXG4vKipcbiAqIE5vZGVzIGRlZmluZSBoaWVyYXJjaHkgYW5kIGdlb21ldHJpY2FsIHRyYW5zZm9ybWF0aW9ucy4gVGhleSBjYW4gYmUgbW92ZWRcbiAqICh0cmFuc2xhdGVkKSwgc2NhbGVkIGFuZCByb3RhdGVkLlxuICpcbiAqIEEgTm9kZSBpcyBlaXRoZXIgbW91bnRlZCBvciB1bm1vdW50ZWQuIFVubW91bnRlZCBub2RlcyBhcmUgZGV0YWNoZWQgZnJvbSB0aGVcbiAqIHNjZW5lIGdyYXBoLiBVbm1vdW50ZWQgbm9kZXMgaGF2ZSBubyBwYXJlbnQgbm9kZSwgd2hpbGUgZWFjaCBtb3VudGVkIG5vZGUgaGFzXG4gKiBleGFjdGx5IG9uZSBwYXJlbnQuIE5vZGVzIGhhdmUgYW4gYXJiaXRhcnkgbnVtYmVyIG9mIGNoaWxkcmVuLCB3aGljaCBjYW4gYmVcbiAqIGR5bmFtaWNhbGx5IGFkZGVkIHVzaW5nIEB7QGxpbmsgYWRkQ2hpbGR9LlxuICpcbiAqIEVhY2ggTm9kZXMgaGF2ZSBhbiBhcmJpdHJhcnkgbnVtYmVyIG9mIGBjb21wb25lbnRzYC4gVGhvc2UgY29tcG9uZW50cyBjYW5cbiAqIHNlbmQgYGRyYXdgIGNvbW1hbmRzIHRvIHRoZSByZW5kZXJlciBvciBtdXRhdGUgdGhlIG5vZGUgaXRzZWxmLCBpbiB3aGljaCBjYXNlXG4gKiB0aGV5IGRlZmluZSBiZWhhdmlvciBpbiB0aGUgbW9zdCBleHBsaWNpdCB3YXkuIENvbXBvbmVudHMgdGhhdCBzZW5kIGBkcmF3YFxuICogY29tbWFuZHMgYWFyZSBjb25zaWRlcmVkIGByZW5kZXJhYmxlc2AuIEZyb20gdGhlIG5vZGUncyBwZXJzcGVjdGl2ZSwgdGhlcmUgaXNcbiAqIG5vIGRpc3RpbmN0aW9uIGJldHdlZW4gbm9kZXMgdGhhdCBzZW5kIGRyYXcgY29tbWFuZHMgYW5kIG5vZGVzIHRoYXQgZGVmaW5lXG4gKiBiZWhhdmlvci5cbiAqXG4gKiBCZWNhdXNlIG9mIHRoZSBmYWN0IHRoYXQgTm9kZXMgdGhlbXNlbGYgYXJlIHZlcnkgdW5vcGluaW90ZWQgKHRoZXkgZG9uJ3RcbiAqIFwicmVuZGVyXCIgdG8gYW55dGhpbmcpLCB0aGV5IGFyZSBvZnRlbiBiZWluZyBzdWJjbGFzc2VkIGluIG9yZGVyIHRvIGFkZCBlLmcuXG4gKiBjb21wb25lbnRzIGF0IGluaXRpYWxpemF0aW9uIHRvIHRoZW0uIEJlY2F1c2Ugb2YgdGhpcyBmbGV4aWJpbGl0eSwgdGhleSBtaWdodFxuICogYXMgd2VsbCBoYXZlIGJlZW4gY2FsbGVkIGBFbnRpdGllc2AuXG4gKlxuICogQGV4YW1wbGVcbiAqIC8vIGNyZWF0ZSB0aHJlZSBkZXRhY2hlZCAodW5tb3VudGVkKSBub2Rlc1xuICogdmFyIHBhcmVudCA9IG5ldyBOb2RlKCk7XG4gKiB2YXIgY2hpbGQxID0gbmV3IE5vZGUoKTtcbiAqIHZhciBjaGlsZDIgPSBuZXcgTm9kZSgpO1xuICpcbiAqIC8vIGJ1aWxkIGFuIHVubW91bnRlZCBzdWJ0cmVlIChwYXJlbnQgaXMgc3RpbGwgZGV0YWNoZWQpXG4gKiBwYXJlbnQuYWRkQ2hpbGQoY2hpbGQxKTtcbiAqIHBhcmVudC5hZGRDaGlsZChjaGlsZDIpO1xuICpcbiAqIC8vIG1vdW50IHBhcmVudCBieSBhZGRpbmcgaXQgdG8gdGhlIGNvbnRleHRcbiAqIHZhciBjb250ZXh0ID0gRmFtb3VzLmNyZWF0ZUNvbnRleHQoXCJib2R5XCIpO1xuICogY29udGV4dC5hZGRDaGlsZChwYXJlbnQpO1xuICpcbiAqIEBjbGFzcyBOb2RlXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gTm9kZSAoKSB7XG4gICAgdGhpcy5fY2FsY3VsYXRlZFZhbHVlcyA9IHtcbiAgICAgICAgdHJhbnNmb3JtOiBuZXcgRmxvYXQzMkFycmF5KElERU5UKSxcbiAgICAgICAgc2l6ZTogbmV3IEZsb2F0MzJBcnJheSgzKVxuICAgIH07XG5cbiAgICB0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlID0gZmFsc2U7XG4gICAgdGhpcy5faW5VcGRhdGUgPSBmYWxzZTtcblxuICAgIHRoaXMuX3VwZGF0ZVF1ZXVlID0gW107XG4gICAgdGhpcy5fbmV4dFVwZGF0ZVF1ZXVlID0gW107XG5cbiAgICB0aGlzLl9mcmVlZENvbXBvbmVudEluZGljaWVzID0gW107XG4gICAgdGhpcy5fY29tcG9uZW50cyA9IFtdO1xuXG4gICAgdGhpcy5fZnJlZWRDaGlsZEluZGljaWVzID0gW107XG4gICAgdGhpcy5fY2hpbGRyZW4gPSBbXTtcblxuICAgIHRoaXMuX3BhcmVudCA9IG51bGw7XG4gICAgdGhpcy5fZ2xvYmFsVXBkYXRlciA9IG51bGw7XG5cbiAgICB0aGlzLl9sYXN0RXVsZXJYID0gMDtcbiAgICB0aGlzLl9sYXN0RXVsZXJZID0gMDtcbiAgICB0aGlzLl9sYXN0RXVsZXJaID0gMDtcbiAgICB0aGlzLl9sYXN0RXVsZXIgPSBmYWxzZTtcblxuICAgIHRoaXMudmFsdWUgPSBuZXcgTm9kZS5TcGVjKCk7XG59XG5cbk5vZGUuUkVMQVRJVkVfU0laRSA9IFNpemUuUkVMQVRJVkU7XG5Ob2RlLkFCU09MVVRFX1NJWkUgPSBTaXplLkFCU09MVVRFO1xuTm9kZS5SRU5ERVJfU0laRSA9IFNpemUuUkVOREVSO1xuTm9kZS5ERUZBVUxUX1NJWkUgPSBTaXplLkRFRkFVTFQ7XG5cbi8qKlxuICogQSBOb2RlIHNwZWMgaG9sZHMgdGhlIFwiZGF0YVwiIGFzc29jaWF0ZWQgd2l0aCBhIE5vZGUuXG4gKlxuICogQGNsYXNzIFNwZWNcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwcm9wZXJ0eSB7U3RyaW5nfSBsb2NhdGlvbiBwYXRoIHRvIHRoZSBub2RlIChlLmcuIFwiYm9keS8wLzFcIilcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBzaG93U3RhdGVcbiAqIEBwcm9wZXJ0eSB7Qm9vbGVhbn0gc2hvd1N0YXRlLm1vdW50ZWRcbiAqIEBwcm9wZXJ0eSB7Qm9vbGVhbn0gc2hvd1N0YXRlLnNob3duXG4gKiBAcHJvcGVydHkge051bWJlcn0gc2hvd1N0YXRlLm9wYWNpdHlcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBvZmZzZXRzXG4gKiBAcHJvcGVydHkge0Zsb2F0MzJBcnJheS48TnVtYmVyPn0gb2Zmc2V0cy5tb3VudFBvaW50XG4gKiBAcHJvcGVydHkge0Zsb2F0MzJBcnJheS48TnVtYmVyPn0gb2Zmc2V0cy5hbGlnblxuICogQHByb3BlcnR5IHtGbG9hdDMyQXJyYXkuPE51bWJlcj59IG9mZnNldHMub3JpZ2luXG4gKiBAcHJvcGVydHkge09iamVjdH0gdmVjdG9yc1xuICogQHByb3BlcnR5IHtGbG9hdDMyQXJyYXkuPE51bWJlcj59IHZlY3RvcnMucG9zaXRpb25cbiAqIEBwcm9wZXJ0eSB7RmxvYXQzMkFycmF5LjxOdW1iZXI+fSB2ZWN0b3JzLnJvdGF0aW9uXG4gKiBAcHJvcGVydHkge0Zsb2F0MzJBcnJheS48TnVtYmVyPn0gdmVjdG9ycy5zY2FsZVxuICogQHByb3BlcnR5IHtPYmplY3R9IHNpemVcbiAqIEBwcm9wZXJ0eSB7RmxvYXQzMkFycmF5LjxOdW1iZXI+fSBzaXplLnNpemVNb2RlXG4gKiBAcHJvcGVydHkge0Zsb2F0MzJBcnJheS48TnVtYmVyPn0gc2l6ZS5wcm9wb3J0aW9uYWxcbiAqIEBwcm9wZXJ0eSB7RmxvYXQzMkFycmF5LjxOdW1iZXI+fSBzaXplLmRpZmZlcmVudGlhbFxuICogQHByb3BlcnR5IHtGbG9hdDMyQXJyYXkuPE51bWJlcj59IHNpemUuYWJzb2x1dGVcbiAqIEBwcm9wZXJ0eSB7RmxvYXQzMkFycmF5LjxOdW1iZXI+fSBzaXplLnJlbmRlclxuICovXG5Ob2RlLlNwZWMgPSBmdW5jdGlvbiBTcGVjICgpIHtcbiAgICB0aGlzLmxvY2F0aW9uID0gbnVsbDtcbiAgICB0aGlzLnNob3dTdGF0ZSA9IHtcbiAgICAgICAgbW91bnRlZDogZmFsc2UsXG4gICAgICAgIHNob3duOiBmYWxzZSxcbiAgICAgICAgb3BhY2l0eTogMVxuICAgIH07XG4gICAgdGhpcy5vZmZzZXRzID0ge1xuICAgICAgICBtb3VudFBvaW50OiBuZXcgRmxvYXQzMkFycmF5KDMpLFxuICAgICAgICBhbGlnbjogbmV3IEZsb2F0MzJBcnJheSgzKSxcbiAgICAgICAgb3JpZ2luOiBuZXcgRmxvYXQzMkFycmF5KDMpXG4gICAgfTtcbiAgICB0aGlzLnZlY3RvcnMgPSB7XG4gICAgICAgIHBvc2l0aW9uOiBuZXcgRmxvYXQzMkFycmF5KDMpLFxuICAgICAgICByb3RhdGlvbjogbmV3IEZsb2F0MzJBcnJheShRVUFUKSxcbiAgICAgICAgc2NhbGU6IG5ldyBGbG9hdDMyQXJyYXkoT05FUylcbiAgICB9O1xuICAgIHRoaXMuc2l6ZSA9IHtcbiAgICAgICAgc2l6ZU1vZGU6IG5ldyBGbG9hdDMyQXJyYXkoW1NpemUuUkVMQVRJVkUsIFNpemUuUkVMQVRJVkUsIFNpemUuUkVMQVRJVkVdKSxcbiAgICAgICAgcHJvcG9ydGlvbmFsOiBuZXcgRmxvYXQzMkFycmF5KE9ORVMpLFxuICAgICAgICBkaWZmZXJlbnRpYWw6IG5ldyBGbG9hdDMyQXJyYXkoMyksXG4gICAgICAgIGFic29sdXRlOiBuZXcgRmxvYXQzMkFycmF5KDMpLFxuICAgICAgICByZW5kZXI6IG5ldyBGbG9hdDMyQXJyYXkoMylcbiAgICB9O1xuICAgIHRoaXMuVUlFdmVudHMgPSBbXTtcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lIHRoZSBub2RlJ3MgbG9jYXRpb24gaW4gdGhlIHNjZW5lIGdyYXBoIGhpZXJhcmNoeS5cbiAqIEEgbG9jYXRpb24gb2YgYGJvZHkvMC8xYCBjYW4gYmUgaW50ZXJwcmV0ZWQgYXMgdGhlIGZvbGxvd2luZyBzY2VuZSBncmFwaFxuICogaGllcmFyY2h5IChpZ25vcmluZyBzaWJsaW5ncyBvZiBhbmNlc3RvcnMgYW5kIGFkZGl0aW9uYWwgY2hpbGQgbm9kZXMpOlxuICpcbiAqIGBDb250ZXh0OmJvZHlgIC0+IGBOb2RlOjBgIC0+IGBOb2RlOjFgLCB3aGVyZSBgTm9kZToxYCBpcyB0aGUgbm9kZSB0aGVcbiAqIGBnZXRMb2NhdGlvbmAgbWV0aG9kIGhhcyBiZWVuIGludm9rZWQgb24uXG4gKlxuICogQG1ldGhvZCBnZXRMb2NhdGlvblxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gbG9jYXRpb24gKHBhdGgpLCBlLmcuIGBib2R5LzAvMWBcbiAqL1xuTm9kZS5wcm90b3R5cGUuZ2V0TG9jYXRpb24gPSBmdW5jdGlvbiBnZXRMb2NhdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWUubG9jYXRpb247XG59O1xuXG4vKipcbiAqIEBhbGlhcyBnZXRJZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gdGhlIHBhdGggb2YgdGhlIE5vZGVcbiAqL1xuTm9kZS5wcm90b3R5cGUuZ2V0SWQgPSBOb2RlLnByb3RvdHlwZS5nZXRMb2NhdGlvbjtcblxuLyoqXG4gKiBHbG9iYWxseSBkaXNwYXRjaGVzIHRoZSBldmVudCB1c2luZyB0aGUgU2NlbmUncyBEaXNwYXRjaC4gQWxsIG5vZGVzIHdpbGxcbiAqIHJlY2VpdmUgdGhlIGRpc3BhdGNoZWQgZXZlbnQuXG4gKlxuICogQG1ldGhvZCBlbWl0XG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBldmVudCAgIEV2ZW50IHR5cGUuXG4gKiBAcGFyYW0gIHtPYmplY3R9IHBheWxvYWQgRXZlbnQgb2JqZWN0IHRvIGJlIGRpc3BhdGNoZWQuXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gZW1pdCAoZXZlbnQsIHBheWxvYWQpIHtcbiAgICB2YXIgY3VycmVudCA9IHRoaXM7XG5cbiAgICB3aGlsZSAoY3VycmVudCAhPT0gY3VycmVudC5nZXRQYXJlbnQoKSkge1xuICAgICAgICBjdXJyZW50ID0gY3VycmVudC5nZXRQYXJlbnQoKTtcbiAgICB9XG5cbiAgICBjdXJyZW50LmdldERpc3BhdGNoKCkuZGlzcGF0Y2goZXZlbnQsIHBheWxvYWQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLy8gVEhJUyBXSUxMIEJFIERFUFJJQ0FURURcbk5vZGUucHJvdG90eXBlLnNlbmREcmF3Q29tbWFuZCA9IGZ1bmN0aW9uIHNlbmREcmF3Q29tbWFuZCAobWVzc2FnZSkge1xuICAgIHRoaXMuX2dsb2JhbFVwZGF0ZXIubWVzc2FnZShtZXNzYWdlKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgc2VyaWFsaXplcyB0aGUgTm9kZSwgaW5jbHVkaW5nIGFsbCBwcmV2aW91c2x5IGFkZGVkIGNvbXBvbmVudHMuXG4gKlxuICogQG1ldGhvZCBnZXRWYWx1ZVxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gICAgIFNlcmlhbGl6ZWQgcmVwcmVzZW50YXRpb24gb2YgdGhlIG5vZGUsIGluY2x1ZGluZ1xuICogICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50cy5cbiAqL1xuTm9kZS5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiBnZXRWYWx1ZSAoKSB7XG4gICAgdmFyIG51bWJlck9mQ2hpbGRyZW4gPSB0aGlzLl9jaGlsZHJlbi5sZW5ndGg7XG4gICAgdmFyIG51bWJlck9mQ29tcG9uZW50cyA9IHRoaXMuX2NvbXBvbmVudHMubGVuZ3RoO1xuICAgIHZhciBpID0gMDtcblxuICAgIHZhciB2YWx1ZSA9IHtcbiAgICAgICAgbG9jYXRpb246IHRoaXMudmFsdWUubG9jYXRpb24sXG4gICAgICAgIHNwZWM6IHRoaXMudmFsdWUsXG4gICAgICAgIGNvbXBvbmVudHM6IG5ldyBBcnJheShudW1iZXJPZkNvbXBvbmVudHMpLFxuICAgICAgICBjaGlsZHJlbjogbmV3IEFycmF5KG51bWJlck9mQ2hpbGRyZW4pXG4gICAgfTtcblxuICAgIGZvciAoOyBpIDwgbnVtYmVyT2ZDaGlsZHJlbiA7IGkrKylcbiAgICAgICAgaWYgKHRoaXMuX2NoaWxkcmVuW2ldICYmIHRoaXMuX2NoaWxkcmVuW2ldLmdldFZhbHVlKVxuICAgICAgICAgICAgdmFsdWUuY2hpbGRyZW5baV0gPSB0aGlzLl9jaGlsZHJlbltpXS5nZXRWYWx1ZSgpO1xuXG4gICAgZm9yIChpID0gMCA7IGkgPCBudW1iZXJPZkNvbXBvbmVudHMgOyBpKyspXG4gICAgICAgIGlmICh0aGlzLl9jb21wb25lbnRzW2ldICYmIHRoaXMuX2NvbXBvbmVudHNbaV0uZ2V0VmFsdWUpXG4gICAgICAgICAgICB2YWx1ZS5jb21wb25lbnRzW2ldID0gdGhpcy5fY29tcG9uZW50c1tpXS5nZXRWYWx1ZSgpO1xuXG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuLyoqXG4gKiBTaW1pbGFyIHRvIEB7QGxpbmsgZ2V0VmFsdWV9LCBidXQgcmV0dXJucyB0aGUgYWN0dWFsIFwiY29tcHV0ZWRcIiB2YWx1ZS4gRS5nLlxuICogYSBwcm9wb3J0aW9uYWwgc2l6ZSBvZiAwLjUgbWlnaHQgcmVzb2x2ZSBpbnRvIGEgXCJjb21wdXRlZFwiIHNpemUgb2YgMjAwcHhcbiAqIChhc3N1bWluZyB0aGUgcGFyZW50IGhhcyBhIHdpZHRoIG9mIDQwMHB4KS5cbiAqXG4gKiBAbWV0aG9kIGdldENvbXB1dGVkVmFsdWVcbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICBTZXJpYWxpemVkIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBub2RlLCBpbmNsdWRpbmdcbiAqICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuLCBleGNsdWRpbmcgY29tcG9uZW50cy5cbiAqL1xuTm9kZS5wcm90b3R5cGUuZ2V0Q29tcHV0ZWRWYWx1ZSA9IGZ1bmN0aW9uIGdldENvbXB1dGVkVmFsdWUgKCkge1xuICAgIHZhciBudW1iZXJPZkNoaWxkcmVuID0gdGhpcy5fY2hpbGRyZW4ubGVuZ3RoO1xuXG4gICAgdmFyIHZhbHVlID0ge1xuICAgICAgICBsb2NhdGlvbjogdGhpcy52YWx1ZS5sb2NhdGlvbixcbiAgICAgICAgY29tcHV0ZWRWYWx1ZXM6IHRoaXMuX2NhbGN1bGF0ZWRWYWx1ZXMsXG4gICAgICAgIGNoaWxkcmVuOiBuZXcgQXJyYXkobnVtYmVyT2ZDaGlsZHJlbilcbiAgICB9O1xuXG4gICAgZm9yICh2YXIgaSA9IDAgOyBpIDwgbnVtYmVyT2ZDaGlsZHJlbiA7IGkrKylcbiAgICAgICAgdmFsdWUuY2hpbGRyZW5baV0gPSB0aGlzLl9jaGlsZHJlbltpXS5nZXRDb21wdXRlZFZhbHVlKCk7XG5cbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG4vKipcbiAqIFJldHJpZXZlcyBhbGwgY2hpbGRyZW4gb2YgdGhlIGN1cnJlbnQgbm9kZS5cbiAqXG4gKiBAbWV0aG9kIGdldENoaWxkcmVuXG4gKlxuICogQHJldHVybiB7QXJyYXkuPE5vZGU+fSAgIEFuIGFycmF5IG9mIGNoaWxkcmVuLlxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRDaGlsZHJlbiA9IGZ1bmN0aW9uIGdldENoaWxkcmVuICgpIHtcbiAgICByZXR1cm4gdGhpcy5fY2hpbGRyZW47XG59O1xuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgcGFyZW50IG9mIHRoZSBjdXJyZW50IG5vZGUuIFVubW91bnRlZCBub2RlcyBkbyBub3QgaGF2ZSBhXG4gKiBwYXJlbnQgbm9kZS5cbiAqXG4gKiBAbWV0aG9kIGdldFBhcmVudFxuICpcbiAqIEByZXR1cm4ge05vZGV9ICAgICAgIFBhcmVudCBub2RlLlxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRQYXJlbnQgPSBmdW5jdGlvbiBnZXRQYXJlbnQgKCkge1xuICAgIHJldHVybiB0aGlzLl9wYXJlbnQ7XG59O1xuXG4vKipcbiAqIFNjaGVkdWxlcyB0aGUgQHtAbGluayB1cGRhdGV9IGZ1bmN0aW9uIG9mIHRoZSBub2RlIHRvIGJlIGludm9rZWQgb24gdGhlIG5leHRcbiAqIGZyYW1lIChpZiBubyB1cGRhdGUgZHVyaW5nIHRoaXMgZnJhbWUgaGFzIGJlZW4gc2NoZWR1bGVkIGFscmVhZHkpLlxuICogSWYgdGhlIG5vZGUgaXMgY3VycmVudGx5IGJlaW5nIHVwZGF0ZWQgKHdoaWNoIG1lYW5zIG9uZSBvZiB0aGUgcmVxdWVzdGVyc1xuICogaW52b2tlZCByZXF1ZXN0c1VwZGF0ZSB3aGlsZSBiZWluZyB1cGRhdGVkIGl0c2VsZiksIGFuIHVwZGF0ZSB3aWxsIGJlXG4gKiBzY2hlZHVsZWQgb24gdGhlIG5leHQgZnJhbWUuXG4gKlxuICogQG1ldGhvZCByZXF1ZXN0VXBkYXRlXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSByZXF1ZXN0ZXIgICBJZiB0aGUgcmVxdWVzdGVyIGhhcyBhbiBgb25VcGRhdGVgIG1ldGhvZCwgaXRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lsbCBiZSBpbnZva2VkIGR1cmluZyB0aGUgbmV4dCB1cGRhdGUgcGhhc2Ugb2ZcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIG5vZGUuXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5yZXF1ZXN0VXBkYXRlID0gZnVuY3Rpb24gcmVxdWVzdFVwZGF0ZSAocmVxdWVzdGVyKSB7XG4gICAgaWYgKHRoaXMuX2luVXBkYXRlIHx8ICF0aGlzLmlzTW91bnRlZCgpKVxuICAgICAgICByZXR1cm4gdGhpcy5yZXF1ZXN0VXBkYXRlT25OZXh0VGljayhyZXF1ZXN0ZXIpO1xuICAgIHRoaXMuX3VwZGF0ZVF1ZXVlLnB1c2gocmVxdWVzdGVyKTtcbiAgICBpZiAoIXRoaXMuX3JlcXVlc3RpbmdVcGRhdGUpIHRoaXMuX3JlcXVlc3RVcGRhdGUoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2NoZWR1bGVzIGFuIHVwZGF0ZSBvbiB0aGUgbmV4dCB0aWNrLiBTaW1pbGFyaWx5IHRvIEB7QGxpbmsgcmVxdWVzdFVwZGF0ZX0sXG4gKiBgcmVxdWVzdFVwZGF0ZU9uTmV4dFRpY2tgIHNjaGVkdWxlcyB0aGUgbm9kZSdzIGBvblVwZGF0ZWAgZnVuY3Rpb24gdG8gYmVcbiAqIGludm9rZWQgb24gdGhlIGZyYW1lIGFmdGVyIHRoZSBuZXh0IGludm9jYXRpb24gb24gdGhlIG5vZGUncyBvblVwZGF0ZSBmdW5jdGlvbi5cbiAqXG4gKiBAbWV0aG9kIHJlcXVlc3RVcGRhdGVPbk5leHRUaWNrXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSByZXF1ZXN0ZXIgICBJZiB0aGUgcmVxdWVzdGVyIGhhcyBhbiBgb25VcGRhdGVgIG1ldGhvZCwgaXRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lsbCBiZSBpbnZva2VkIGR1cmluZyB0aGUgbmV4dCB1cGRhdGUgcGhhc2Ugb2ZcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIG5vZGUuXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5yZXF1ZXN0VXBkYXRlT25OZXh0VGljayA9IGZ1bmN0aW9uIHJlcXVlc3RVcGRhdGVPbk5leHRUaWNrIChyZXF1ZXN0ZXIpIHtcbiAgICB0aGlzLl9uZXh0VXBkYXRlUXVldWUucHVzaChyZXF1ZXN0ZXIpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIG9iamVjdCByZXNwb25zaWJsZSBmb3IgdXBkYXRpbmcgdGhpcyBub2RlLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IFRoZSBnbG9iYWwgdXBkYXRlci5cbiAqL1xuTm9kZS5wcm90b3R5cGUuZ2V0VXBkYXRlciA9IGZ1bmN0aW9uIGdldFVwZGF0ZXIgKCkge1xuICAgIHJldHVybiB0aGlzLl9nbG9iYWxVcGRhdGVyO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIG5vZGUgaXMgbW91bnRlZC4gVW5tb3VudGVkIG5vZGVzIGFyZSBkZXRhY2hlZCBmcm9tIHRoZSBzY2VuZVxuICogZ3JhcGguXG4gKlxuICogQG1ldGhvZCBpc01vdW50ZWRcbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufSAgICBCb29sZWFuIGluZGljYXRpbmcgd2VhdGhlciB0aGUgbm9kZSBpcyBtb3VudGVkIG9yIG5vdC5cbiAqL1xuTm9kZS5wcm90b3R5cGUuaXNNb3VudGVkID0gZnVuY3Rpb24gaXNNb3VudGVkICgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZS5zaG93U3RhdGUubW91bnRlZDtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBub2RlIGlzIHZpc2libGUgKFwic2hvd25cIikuXG4gKlxuICogQG1ldGhvZCBpc1Nob3duXG4gKlxuICogQHJldHVybiB7Qm9vbGVhbn0gICAgQm9vbGVhbiBpbmRpY2F0aW5nIHdlYXRoZXIgdGhlIG5vZGUgaXMgdmlzaWJsZVxuICogICAgICAgICAgICAgICAgICAgICAgKFwic2hvd25cIikgb3Igbm90LlxuICovXG5Ob2RlLnByb3RvdHlwZS5pc1Nob3duID0gZnVuY3Rpb24gaXNTaG93biAoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWUuc2hvd1N0YXRlLnNob3duO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmVzIHRoZSBub2RlJ3MgcmVsYXRpdmUgb3BhY2l0eS5cbiAqIFRoZSBvcGFjaXR5IG5lZWRzIHRvIGJlIHdpdGhpbiBbMCwgMV0sIHdoZXJlIDAgaW5kaWNhdGVzIGEgY29tcGxldGVseVxuICogdHJhbnNwYXJlbnQsIHRoZXJlZm9yZSBpbnZpc2libGUgbm9kZSwgd2hlcmVhcyBhbiBvcGFjaXR5IG9mIDEgbWVhbnMgdGhlXG4gKiBub2RlIGlzIGNvbXBsZXRlbHkgc29saWQuXG4gKlxuICogQG1ldGhvZCBnZXRPcGFjaXR5XG4gKlxuICogQHJldHVybiB7TnVtYmVyfSAgICAgICAgIFJlbGF0aXZlIG9wYWNpdHkgb2YgdGhlIG5vZGUuXG4gKi9cbk5vZGUucHJvdG90eXBlLmdldE9wYWNpdHkgPSBmdW5jdGlvbiBnZXRPcGFjaXR5ICgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZS5zaG93U3RhdGUub3BhY2l0eTtcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB0aGUgbm9kZSdzIHByZXZpb3VzbHkgc2V0IG1vdW50IHBvaW50LlxuICpcbiAqIEBtZXRob2QgZ2V0TW91bnRQb2ludFxuICpcbiAqIEByZXR1cm4ge0Zsb2F0MzJBcnJheX0gICBBbiBhcnJheSByZXByZXNlbnRpbmcgdGhlIG1vdW50IHBvaW50LlxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRNb3VudFBvaW50ID0gZnVuY3Rpb24gZ2V0TW91bnRQb2ludCAoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWUub2Zmc2V0cy5tb3VudFBvaW50O1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmVzIHRoZSBub2RlJ3MgcHJldmlvdXNseSBzZXQgYWxpZ24uXG4gKlxuICogQG1ldGhvZCBnZXRBbGlnblxuICpcbiAqIEByZXR1cm4ge0Zsb2F0MzJBcnJheX0gICBBbiBhcnJheSByZXByZXNlbnRpbmcgdGhlIGFsaWduLlxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRBbGlnbiA9IGZ1bmN0aW9uIGdldEFsaWduICgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZS5vZmZzZXRzLmFsaWduO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmVzIHRoZSBub2RlJ3MgcHJldmlvdXNseSBzZXQgb3JpZ2luLlxuICpcbiAqIEBtZXRob2QgZ2V0T3JpZ2luXG4gKlxuICogQHJldHVybiB7RmxvYXQzMkFycmF5fSAgIEFuIGFycmF5IHJlcHJlc2VudGluZyB0aGUgb3JpZ2luLlxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRPcmlnaW4gPSBmdW5jdGlvbiBnZXRPcmlnaW4gKCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlLm9mZnNldHMub3JpZ2luO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmVzIHRoZSBub2RlJ3MgcHJldmlvdXNseSBzZXQgcG9zaXRpb24uXG4gKlxuICogQG1ldGhvZCBnZXRQb3NpdGlvblxuICpcbiAqIEByZXR1cm4ge0Zsb2F0MzJBcnJheX0gICBBbiBhcnJheSByZXByZXNlbnRpbmcgdGhlIHBvc2l0aW9uLlxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uIGdldFBvc2l0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZS52ZWN0b3JzLnBvc2l0aW9uO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBub2RlJ3MgY3VycmVudCByb3RhdGlvblxuICpcbiAqIEBtZXRob2QgZ2V0Um90YXRpb25cbiAqXG4gKiBAcmV0dXJuIHtGbG9hdDMyQXJyYXl9IGFuIGFycmF5IG9mIGZvdXIgdmFsdWVzLCBzaG93aW5nIHRoZSByb3RhdGlvbiBhcyBhIHF1YXRlcm5pb25cbiAqL1xuTm9kZS5wcm90b3R5cGUuZ2V0Um90YXRpb24gPSBmdW5jdGlvbiBnZXRSb3RhdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWUudmVjdG9ycy5yb3RhdGlvbjtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgc2NhbGUgb2YgdGhlIG5vZGVcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7RmxvYXQzMkFycmF5fSBhbiBhcnJheSBzaG93aW5nIHRoZSBjdXJyZW50IHNjYWxlIHZlY3RvclxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRTY2FsZSA9IGZ1bmN0aW9uIGdldFNjYWxlICgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZS52ZWN0b3JzLnNjYWxlO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjdXJyZW50IHNpemUgbW9kZSBvZiB0aGUgbm9kZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtGbG9hdDMyQXJyYXl9IGFuIGFycmF5IG9mIG51bWJlcnMgc2hvd2luZyB0aGUgY3VycmVudCBzaXplIG1vZGVcbiAqL1xuTm9kZS5wcm90b3R5cGUuZ2V0U2l6ZU1vZGUgPSBmdW5jdGlvbiBnZXRTaXplTW9kZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWUuc2l6ZS5zaXplTW9kZTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgY3VycmVudCBwcm9wb3J0aW9uYWwgc2l6ZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtGbG9hdDMyQXJyYXl9IGEgdmVjdG9yIDMgc2hvd2luZyB0aGUgY3VycmVudCBwcm9wb3J0aW9uYWwgc2l6ZVxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRQcm9wb3J0aW9uYWxTaXplID0gZnVuY3Rpb24gZ2V0UHJvcG9ydGlvbmFsU2l6ZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWUuc2l6ZS5wcm9wb3J0aW9uYWw7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGRpZmZlcmVudGlhbCBzaXplIG9mIHRoZSBub2RlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0Zsb2F0MzJBcnJheX0gYSB2ZWN0b3IgMyBzaG93aW5nIHRoZSBjdXJyZW50IGRpZmZlcmVudGlhbCBzaXplXG4gKi9cbk5vZGUucHJvdG90eXBlLmdldERpZmZlcmVudGlhbFNpemUgPSBmdW5jdGlvbiBnZXREaWZmZXJlbnRpYWxTaXplICgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZS5zaXplLmRpZmZlcmVudGlhbDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgYWJzb2x1dGUgc2l6ZSBvZiB0aGUgbm9kZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtGbG9hdDMyQXJyYXl9IGEgdmVjdG9yIDMgc2hvd2luZyB0aGUgY3VycmVudCBhYnNvbHV0ZSBzaXplIG9mIHRoZSBub2RlXG4gKi9cbk5vZGUucHJvdG90eXBlLmdldEFic29sdXRlU2l6ZSA9IGZ1bmN0aW9uIGdldEFic29sdXRlU2l6ZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWUuc2l6ZS5hYnNvbHV0ZTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgY3VycmVudCBSZW5kZXIgU2l6ZSBvZiB0aGUgbm9kZS4gTm90ZSB0aGF0IHRoZSByZW5kZXIgc2l6ZVxuICogaXMgYXN5bmNocm9ub3VzICh3aWxsIGFsd2F5cyBiZSBvbmUgZnJhbWUgYmVoaW5kKSBhbmQgbmVlZHMgdG8gYmUgZXhwbGljaXRlbHlcbiAqIGNhbGN1bGF0ZWQgYnkgc2V0dGluZyB0aGUgcHJvcGVyIHNpemUgbW9kZS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7RmxvYXQzMkFycmF5fSBhIHZlY3RvciAzIHNob3dpbmcgdGhlIGN1cnJlbnQgcmVuZGVyIHNpemVcbiAqL1xuTm9kZS5wcm90b3R5cGUuZ2V0UmVuZGVyU2l6ZSA9IGZ1bmN0aW9uIGdldFJlbmRlclNpemUgKCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlLnNpemUucmVuZGVyO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBleHRlcm5hbCBzaXplIG9mIHRoZSBub2RlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0Zsb2F0MzJBcnJheX0gYSB2ZWN0b3IgMyBvZiB0aGUgZmluYWwgY2FsY3VsYXRlZCBzaWRlIG9mIHRoZSBub2RlXG4gKi9cbk5vZGUucHJvdG90eXBlLmdldFNpemUgPSBmdW5jdGlvbiBnZXRTaXplICgpIHtcbiAgICByZXR1cm4gdGhpcy5fY2FsY3VsYXRlZFZhbHVlcy5zaXplO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjdXJyZW50IHdvcmxkIHRyYW5zZm9ybSBvZiB0aGUgbm9kZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtGbG9hdDMyQXJyYXl9IGEgMTYgdmFsdWUgdHJhbnNmb3JtXG4gKi9cbk5vZGUucHJvdG90eXBlLmdldFRyYW5zZm9ybSA9IGZ1bmN0aW9uIGdldFRyYW5zZm9ybSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhbGN1bGF0ZWRWYWx1ZXMudHJhbnNmb3JtO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIGxpc3Qgb2YgdGhlIFVJIEV2ZW50cyB0aGF0IGFyZSBjdXJyZW50bHkgYXNzb2NpYXRlZCB3aXRoIHRoaXMgbm9kZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gYW4gYXJyYXkgb2Ygc3RyaW5ncyByZXByZXNlbnRpbmcgdGhlIGN1cnJlbnQgc3Vic2NyaWJlZCBVSSBldmVudCBvZiB0aGlzIG5vZGVcbiAqL1xuTm9kZS5wcm90b3R5cGUuZ2V0VUlFdmVudHMgPSBmdW5jdGlvbiBnZXRVSUV2ZW50cyAoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWUuVUlFdmVudHM7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgY2hpbGQgdG8gdGhpcyBub2RlLiBJZiB0aGlzIG1ldGhvZCBpcyBjYWxsZWQgd2l0aCBubyBhcmd1bWVudCBpdCB3aWxsXG4gKiBjcmVhdGUgYSBuZXcgbm9kZSwgaG93ZXZlciBpdCBjYW4gYWxzbyBiZSBjYWxsZWQgd2l0aCBhbiBleGlzdGluZyBub2RlIHdoaWNoIGl0IHdpbGxcbiAqIGFwcGVuZCB0byB0aGUgbm9kZSB0aGF0IHRoaXMgbWV0aG9kIGlzIGJlaW5nIGNhbGxlZCBvbi4gUmV0dXJucyB0aGUgbmV3IG9yIHBhc3NlZCBpbiBub2RlLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge05vZGUgfCB2b2lkfSBjaGlsZCB0aGUgbm9kZSB0byBhcHBlbmRlZCBvciBubyBub2RlIHRvIGNyZWF0ZSBhIG5ldyBub2RlLlxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoZSBhcHBlbmRlZCBub2RlLlxuICovXG5Ob2RlLnByb3RvdHlwZS5hZGRDaGlsZCA9IGZ1bmN0aW9uIGFkZENoaWxkIChjaGlsZCkge1xuICAgIHZhciBpbmRleCA9IGNoaWxkID8gdGhpcy5fY2hpbGRyZW4uaW5kZXhPZihjaGlsZCkgOiAtMTtcbiAgICBjaGlsZCA9IGNoaWxkID8gY2hpbGQgOiBuZXcgTm9kZSgpO1xuXG4gICAgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICBpbmRleCA9IHRoaXMuX2ZyZWVkQ2hpbGRJbmRpY2llcy5sZW5ndGggPyB0aGlzLl9mcmVlZENoaWxkSW5kaWNpZXMucG9wKCkgOiB0aGlzLl9jaGlsZHJlbi5sZW5ndGg7XG4gICAgICAgIHRoaXMuX2NoaWxkcmVuW2luZGV4XSA9IGNoaWxkO1xuXG4gICAgICAgIGlmICh0aGlzLmlzTW91bnRlZCgpICYmIGNoaWxkLm9uTW91bnQpIHtcbiAgICAgICAgICAgIHZhciBteUlkID0gdGhpcy5nZXRJZCgpO1xuICAgICAgICAgICAgdmFyIGNoaWxkSWQgPSBteUlkICsgJy8nICsgaW5kZXg7XG4gICAgICAgICAgICBjaGlsZC5vbk1vdW50KHRoaXMsIGNoaWxkSWQpO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICByZXR1cm4gY2hpbGQ7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYSBjaGlsZCBub2RlIGZyb20gYW5vdGhlciBub2RlLiBUaGUgcGFzc2VkIGluIG5vZGUgbXVzdCBiZVxuICogYSBjaGlsZCBvZiB0aGUgbm9kZSB0aGF0IHRoaXMgbWV0aG9kIGlzIGNhbGxlZCB1cG9uLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge05vZGV9IGNoaWxkIG5vZGUgdG8gYmUgcmVtb3ZlZFxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHdoZXRoZXIgb3Igbm90IHRoZSBub2RlIHdhcyBzdWNjZXNzZnVsbHkgcmVtb3ZlZFxuICovXG5Ob2RlLnByb3RvdHlwZS5yZW1vdmVDaGlsZCA9IGZ1bmN0aW9uIHJlbW92ZUNoaWxkIChjaGlsZCkge1xuICAgIHZhciBpbmRleCA9IHRoaXMuX2NoaWxkcmVuLmluZGV4T2YoY2hpbGQpO1xuICAgIHZhciBhZGRlZCA9IGluZGV4ICE9PSAtMTtcbiAgICBpZiAoYWRkZWQpIHtcbiAgICAgICAgdGhpcy5fZnJlZWRDaGlsZEluZGljaWVzLnB1c2goaW5kZXgpO1xuXG4gICAgICAgIHRoaXMuX2NoaWxkcmVuW2luZGV4XSA9IG51bGw7XG5cbiAgICAgICAgaWYgKHRoaXMuaXNNb3VudGVkKCkgJiYgY2hpbGQub25EaXNtb3VudClcbiAgICAgICAgICAgIGNoaWxkLm9uRGlzbW91bnQoKTtcbiAgICB9XG4gICAgcmV0dXJuIGFkZGVkO1xufTtcblxuLyoqXG4gKiBFYWNoIGNvbXBvbmVudCBjYW4gb25seSBiZSBhZGRlZCBvbmNlIHBlciBub2RlLlxuICpcbiAqIEBtZXRob2QgYWRkQ29tcG9uZW50XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGNvbXBvbmVudCAgICBBbiBjb21wb25lbnQgdG8gYmUgYWRkZWQuXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IGluZGV4ICAgICAgIFRoZSBpbmRleCBhdCB3aGljaCB0aGUgY29tcG9uZW50IGhhcyBiZWVuXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlZ2lzdGVyZWQuIEluZGljZXMgYXJlbid0IG5lY2Vzc2FyaWx5XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNlY3V0aXZlLlxuICovXG5Ob2RlLnByb3RvdHlwZS5hZGRDb21wb25lbnQgPSBmdW5jdGlvbiBhZGRDb21wb25lbnQgKGNvbXBvbmVudCkge1xuICAgIHZhciBpbmRleCA9IHRoaXMuX2NvbXBvbmVudHMuaW5kZXhPZihjb21wb25lbnQpO1xuICAgIGlmIChpbmRleCA9PT0gLTEpIHtcbiAgICAgICAgaW5kZXggPSB0aGlzLl9mcmVlZENvbXBvbmVudEluZGljaWVzLmxlbmd0aCA/IHRoaXMuX2ZyZWVkQ29tcG9uZW50SW5kaWNpZXMucG9wKCkgOiB0aGlzLl9jb21wb25lbnRzLmxlbmd0aDtcbiAgICAgICAgdGhpcy5fY29tcG9uZW50c1tpbmRleF0gPSBjb21wb25lbnQ7XG5cbiAgICAgICAgaWYgKHRoaXMuaXNNb3VudGVkKCkgJiYgY29tcG9uZW50Lm9uTW91bnQpXG4gICAgICAgICAgICBjb21wb25lbnQub25Nb3VudCh0aGlzLCBpbmRleCk7XG5cbiAgICAgICAgaWYgKHRoaXMuaXNTaG93bigpICYmIGNvbXBvbmVudC5vblNob3cpXG4gICAgICAgICAgICBjb21wb25lbnQub25TaG93KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGluZGV4O1xufTtcblxuLyoqXG4gKiBAbWV0aG9kICBnZXRDb21wb25lbnRcbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGluZGV4ICAgSW5kZXggYXQgd2hpY2ggdGhlIGNvbXBvbmVudCBoYXMgYmVlbiByZWdzaXRlcmVkXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgKHVzaW5nIGBOb2RlI2FkZENvbXBvbmVudGApLlxuICogQHJldHVybiB7Kn0gICAgICAgICAgICAgIFRoZSBjb21wb25lbnQgcmVnaXN0ZXJlZCBhdCB0aGUgcGFzc2VkIGluIGluZGV4IChpZlxuICogICAgICAgICAgICAgICAgICAgICAgICAgIGFueSkuXG4gKi9cbk5vZGUucHJvdG90eXBlLmdldENvbXBvbmVudCA9IGZ1bmN0aW9uIGdldENvbXBvbmVudCAoaW5kZXgpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tcG9uZW50c1tpbmRleF07XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYSBwcmV2aW91c2x5IHZpYSBAe0BsaW5rIGFkZENvbXBvbmVudH0gYWRkZWQgY29tcG9uZW50LlxuICpcbiAqIEBtZXRob2QgcmVtb3ZlQ29tcG9uZW50XG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBjb21wb25lbnQgICBBbiBjb21wb25lbnQgdGhhdCBoYXMgcHJldmlvdXNseSBiZWVuIGFkZGVkXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzaW5nIEB7QGxpbmsgYWRkQ29tcG9uZW50fS5cbiAqXG4gKiBAcmV0dXJuIHtOb2RlfSB0aGlzXG4gKi9cbk5vZGUucHJvdG90eXBlLnJlbW92ZUNvbXBvbmVudCA9IGZ1bmN0aW9uIHJlbW92ZUNvbXBvbmVudCAoY29tcG9uZW50KSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fY29tcG9uZW50cy5pbmRleE9mKGNvbXBvbmVudCk7XG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICB0aGlzLl9mcmVlZENvbXBvbmVudEluZGljaWVzLnB1c2goaW5kZXgpO1xuICAgICAgICBpZiAodGhpcy5pc1Nob3duKCkgJiYgY29tcG9uZW50Lm9uSGlkZSlcbiAgICAgICAgICAgIGNvbXBvbmVudC5vbkhpZGUoKTtcblxuICAgICAgICBpZiAodGhpcy5pc01vdW50ZWQoKSAmJiBjb21wb25lbnQub25EaXNtb3VudClcbiAgICAgICAgICAgIGNvbXBvbmVudC5vbkRpc21vdW50KCk7XG5cbiAgICAgICAgdGhpcy5fY29tcG9uZW50c1tpbmRleF0gPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY29tcG9uZW50O1xufTtcblxuLyoqXG4gKiBTdWJzY3JpYmVzIGEgbm9kZSB0byBhIFVJIEV2ZW50LiBBbGwgY29tcG9uZW50cyBvbiB0aGUgbm9kZVxuICogd2lsbCBoYXZlIHRoZSBvcHBvcnR1bml0eSB0byBiZWdpbiBsaXN0ZW5pbmcgdG8gdGhhdCBldmVudFxuICogYW5kIGFsZXJ0aW5nIHRoZSBzY2VuZSBncmFwaC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50TmFtZSB0aGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Ob2RlLnByb3RvdHlwZS5hZGRVSUV2ZW50ID0gZnVuY3Rpb24gYWRkVUlFdmVudCAoZXZlbnROYW1lKSB7XG4gICAgdmFyIFVJRXZlbnRzID0gdGhpcy5nZXRVSUV2ZW50cygpO1xuICAgIHZhciBjb21wb25lbnRzID0gdGhpcy5fY29tcG9uZW50cztcbiAgICB2YXIgY29tcG9uZW50O1xuXG4gICAgdmFyIGFkZGVkID0gVUlFdmVudHMuaW5kZXhPZihldmVudE5hbWUpICE9PSAtMTtcbiAgICBpZiAoIWFkZGVkKSB7XG4gICAgICAgIFVJRXZlbnRzLnB1c2goZXZlbnROYW1lKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNvbXBvbmVudHMubGVuZ3RoIDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICAgICAgY29tcG9uZW50ID0gY29tcG9uZW50c1tpXTtcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQgJiYgY29tcG9uZW50Lm9uQWRkVUlFdmVudCkgY29tcG9uZW50Lm9uQWRkVUlFdmVudChldmVudE5hbWUpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiBQcml2YXRlIG1ldGhvZCBmb3IgdGhlIE5vZGUgdG8gcmVxdWVzdCBhbiB1cGRhdGUgZm9yIGl0c2VsZi5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gZm9yY2Ugd2hldGhlciBvciBub3QgdG8gZm9yY2UgdGhlIHVwZGF0ZVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbk5vZGUucHJvdG90eXBlLl9yZXF1ZXN0VXBkYXRlID0gZnVuY3Rpb24gX3JlcXVlc3RVcGRhdGUgKGZvcmNlKSB7XG4gICAgaWYgKGZvcmNlIHx8ICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSAmJiB0aGlzLl9nbG9iYWxVcGRhdGVyKSkge1xuICAgICAgICB0aGlzLl9nbG9iYWxVcGRhdGVyLnJlcXVlc3RVcGRhdGUodGhpcyk7XG4gICAgICAgIHRoaXMuX3JlcXVlc3RpbmdVcGRhdGUgPSB0cnVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogUHJpdmF0ZSBtZXRob2QgdG8gc2V0IGFuIG9wdGlvbmFsIHZhbHVlIGluIGFuIGFycmF5LCBhbmRcbiAqIHJlcXVlc3QgYW4gdXBkYXRlIGlmIHRoaXMgY2hhbmdlcyB0aGUgdmFsdWUgb2YgdGhlIGFycmF5LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2ZWMgdGhlIGFycmF5IHRvIGluc2VydCB0aGUgdmFsdWUgaW50b1xuICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4IHRoZSBpbmRleCBhdCB3aGljaCB0byBpbnNlcnQgdGhlIHZhbHVlXG4gKiBAcGFyYW0ge0FueX0gdmFsIHRoZSB2YWx1ZSB0byBwb3RlbnRpYWxseSBpbnNlcnQgKGlmIG5vdCBudWxsIG9yIHVuZGVmaW5lZClcbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufSB3aGV0aGVyIG9yIG5vdCBhIG5ldyB2YWx1ZSB3YXMgaW5zZXJ0ZWQuXG4gKi9cbk5vZGUucHJvdG90eXBlLl92ZWNPcHRpb25hbFNldCA9IGZ1bmN0aW9uIF92ZWNPcHRpb25hbFNldCAodmVjLCBpbmRleCwgdmFsKSB7XG4gICAgaWYgKHZhbCAhPSBudWxsICYmIHZlY1tpbmRleF0gIT09IHZhbCkge1xuICAgICAgICB2ZWNbaW5kZXhdID0gdmFsO1xuICAgICAgICBpZiAoIXRoaXMuX3JlcXVlc3RpbmdVcGRhdGUpIHRoaXMuX3JlcXVlc3RVcGRhdGUoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogU2hvd3MgdGhlIG5vZGUsIHdoaWNoIGlzIHRvIHNheSwgY2FsbHMgb25TaG93IG9uIGFsbCBvZiB0aGVcbiAqIG5vZGUncyBjb21wb25lbnRzLiBSZW5kZXJhYmxlIGNvbXBvbmVudHMgY2FuIHRoZW4gaXNzdWUgdGhlXG4gKiBkcmF3IGNvbW1hbmRzIG5lY2Vzc2FyeSB0byBiZSBzaG93bi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gc2hvdyAoKSB7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBpdGVtcyA9IHRoaXMuX2NvbXBvbmVudHM7XG4gICAgdmFyIGxlbiA9IGl0ZW1zLmxlbmd0aDtcbiAgICB2YXIgaXRlbTtcblxuICAgIHRoaXMudmFsdWUuc2hvd1N0YXRlLnNob3duID0gdHJ1ZTtcblxuICAgIGZvciAoOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgIGl0ZW0gPSBpdGVtc1tpXTtcbiAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5vblNob3cpIGl0ZW0ub25TaG93KCk7XG4gICAgfVxuXG4gICAgaSA9IDA7XG4gICAgaXRlbXMgPSB0aGlzLl9jaGlsZHJlbjtcbiAgICBsZW4gPSBpdGVtcy5sZW5ndGg7XG5cbiAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICBpdGVtID0gaXRlbXNbaV07XG4gICAgICAgIGlmIChpdGVtICYmIGl0ZW0ub25QYXJlbnRTaG93KSBpdGVtLm9uUGFyZW50U2hvdygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogSGlkZXMgdGhlIG5vZGUsIHdoaWNoIGlzIHRvIHNheSwgY2FsbHMgb25IaWRlIG9uIGFsbCBvZiB0aGVcbiAqIG5vZGUncyBjb21wb25lbnRzLiBSZW5kZXJhYmxlIGNvbXBvbmVudHMgY2FuIHRoZW4gaXNzdWVcbiAqIHRoZSBkcmF3IGNvbW1hbmRzIG5lY2Vzc2FyeSB0byBiZSBoaWRkZW5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24gaGlkZSAoKSB7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBpdGVtcyA9IHRoaXMuX2NvbXBvbmVudHM7XG4gICAgdmFyIGxlbiA9IGl0ZW1zLmxlbmd0aDtcbiAgICB2YXIgaXRlbTtcblxuICAgIHRoaXMudmFsdWUuc2hvd1N0YXRlLnNob3duID0gZmFsc2U7XG5cbiAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICBpdGVtID0gaXRlbXNbaV07XG4gICAgICAgIGlmIChpdGVtICYmIGl0ZW0ub25IaWRlKSBpdGVtLm9uSGlkZSgpO1xuICAgIH1cblxuICAgIGkgPSAwO1xuICAgIGl0ZW1zID0gdGhpcy5fY2hpbGRyZW47XG4gICAgbGVuID0gaXRlbXMubGVuZ3RoO1xuXG4gICAgZm9yICg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgaXRlbSA9IGl0ZW1zW2ldO1xuICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uUGFyZW50SGlkZSkgaXRlbS5vblBhcmVudEhpZGUoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGFsaWduIHZhbHVlIG9mIHRoZSBub2RlLiBXaWxsIGNhbGwgb25BbGlnbkNoYW5nZVxuICogb24gYWxsIG9mIHRoZSBOb2RlJ3MgY29tcG9uZW50cy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggQWxpZ24gdmFsdWUgaW4gdGhlIHggZGltZW5zaW9uLlxuICogQHBhcmFtIHtOdW1iZXJ9IHkgQWxpZ24gdmFsdWUgaW4gdGhlIHkgZGltZW5zaW9uLlxuICogQHBhcmFtIHtOdW1iZXJ9IHogQWxpZ24gdmFsdWUgaW4gdGhlIHogZGltZW5zaW9uLlxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUuc2V0QWxpZ24gPSBmdW5jdGlvbiBzZXRBbGlnbiAoeCwgeSwgeikge1xuICAgIHZhciB2ZWMzID0gdGhpcy52YWx1ZS5vZmZzZXRzLmFsaWduO1xuICAgIHZhciBwcm9wb2dhdGUgPSBmYWxzZTtcblxuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYzMsIDAsIHgpIHx8IHByb3BvZ2F0ZTtcbiAgICBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMzLCAxLCB5KSB8fCBwcm9wb2dhdGU7XG4gICAgaWYgKHogIT0gbnVsbCkgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjMywgMiwgKHogLSAwLjUpKSB8fCBwcm9wb2dhdGU7XG5cbiAgICBpZiAocHJvcG9nYXRlKSB7XG4gICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgdmFyIGxpc3QgPSB0aGlzLl9jb21wb25lbnRzO1xuICAgICAgICB2YXIgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgICAgIHZhciBpdGVtO1xuICAgICAgICB4ID0gdmVjM1swXTtcbiAgICAgICAgeSA9IHZlYzNbMV07XG4gICAgICAgIHogPSB2ZWMzWzJdO1xuICAgICAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICAgICAgaXRlbSA9IGxpc3RbaV07XG4gICAgICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uQWxpZ25DaGFuZ2UpIGl0ZW0ub25BbGlnbkNoYW5nZSh4LCB5LCB6KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgbW91bnQgcG9pbnQgdmFsdWUgb2YgdGhlIG5vZGUuIFdpbGwgY2FsbCBvbk1vdW50UG9pbnRDaGFuZ2VcbiAqIG9uIGFsbCBvZiB0aGUgbm9kZSdzIGNvbXBvbmVudHMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IE1vdW50UG9pbnQgdmFsdWUgaW4geCBkaW1lbnNpb25cbiAqIEBwYXJhbSB7TnVtYmVyfSB5IE1vdW50UG9pbnQgdmFsdWUgaW4geSBkaW1lbnNpb25cbiAqIEBwYXJhbSB7TnVtYmVyfSB6IE1vdW50UG9pbnQgdmFsdWUgaW4geiBkaW1lbnNpb25cbiAqXG4gKiBAcmV0dXJuIHtOb2RlfSB0aGlzXG4gKi9cbk5vZGUucHJvdG90eXBlLnNldE1vdW50UG9pbnQgPSBmdW5jdGlvbiBzZXRNb3VudFBvaW50ICh4LCB5LCB6KSB7XG4gICAgdmFyIHZlYzMgPSB0aGlzLnZhbHVlLm9mZnNldHMubW91bnRQb2ludDtcbiAgICB2YXIgcHJvcG9nYXRlID0gZmFsc2U7XG5cbiAgICBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMzLCAwLCB4KSB8fCBwcm9wb2dhdGU7XG4gICAgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjMywgMSwgeSkgfHwgcHJvcG9nYXRlO1xuICAgIGlmICh6ICE9IG51bGwpIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYzMsIDIsICh6IC0gMC41KSkgfHwgcHJvcG9nYXRlO1xuXG4gICAgaWYgKHByb3BvZ2F0ZSkge1xuICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgIHZhciBsaXN0ID0gdGhpcy5fY29tcG9uZW50cztcbiAgICAgICAgdmFyIGxlbiA9IGxpc3QubGVuZ3RoO1xuICAgICAgICB2YXIgaXRlbTtcbiAgICAgICAgeCA9IHZlYzNbMF07XG4gICAgICAgIHkgPSB2ZWMzWzFdO1xuICAgICAgICB6ID0gdmVjM1syXTtcbiAgICAgICAgZm9yICg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgICAgIGl0ZW0gPSBsaXN0W2ldO1xuICAgICAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5vbk1vdW50UG9pbnRDaGFuZ2UpIGl0ZW0ub25Nb3VudFBvaW50Q2hhbmdlKHgsIHksIHopO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBvcmlnaW4gdmFsdWUgb2YgdGhlIG5vZGUuIFdpbGwgY2FsbCBvbk9yaWdpbkNoYW5nZVxuICogb24gYWxsIG9mIHRoZSBub2RlJ3MgY29tcG9uZW50cy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggT3JpZ2luIHZhbHVlIGluIHggZGltZW5zaW9uXG4gKiBAcGFyYW0ge051bWJlcn0geSBPcmlnaW4gdmFsdWUgaW4geSBkaW1lbnNpb25cbiAqIEBwYXJhbSB7TnVtYmVyfSB6IE9yaWdpbiB2YWx1ZSBpbiB6IGRpbWVuc2lvblxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUuc2V0T3JpZ2luID0gZnVuY3Rpb24gc2V0T3JpZ2luICh4LCB5LCB6KSB7XG4gICAgdmFyIHZlYzMgPSB0aGlzLnZhbHVlLm9mZnNldHMub3JpZ2luO1xuICAgIHZhciBwcm9wb2dhdGUgPSBmYWxzZTtcblxuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYzMsIDAsIHgpIHx8IHByb3BvZ2F0ZTtcbiAgICBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMzLCAxLCB5KSB8fCBwcm9wb2dhdGU7XG4gICAgaWYgKHogIT0gbnVsbCkgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjMywgMiwgKHogLSAwLjUpKSB8fCBwcm9wb2dhdGU7XG5cbiAgICBpZiAocHJvcG9nYXRlKSB7XG4gICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgdmFyIGxpc3QgPSB0aGlzLl9jb21wb25lbnRzO1xuICAgICAgICB2YXIgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgICAgIHZhciBpdGVtO1xuICAgICAgICB4ID0gdmVjM1swXTtcbiAgICAgICAgeSA9IHZlYzNbMV07XG4gICAgICAgIHogPSB2ZWMzWzJdO1xuICAgICAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICAgICAgaXRlbSA9IGxpc3RbaV07XG4gICAgICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uT3JpZ2luQ2hhbmdlKSBpdGVtLm9uT3JpZ2luQ2hhbmdlKHgsIHksIHopO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBwb3NpdGlvbiBvZiB0aGUgbm9kZS4gV2lsbCBjYWxsIG9uUG9zaXRpb25DaGFuZ2VcbiAqIG9uIGFsbCBvZiB0aGUgbm9kZSdzIGNvbXBvbmVudHMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IFBvc2l0aW9uIGluIHhcbiAqIEBwYXJhbSB7TnVtYmVyfSB5IFBvc2l0aW9uIGluIHlcbiAqIEBwYXJhbSB7TnVtYmVyfSB6IFBvc2l0aW9uIGluIHpcbiAqXG4gKiBAcmV0dXJuIHtOb2RlfSB0aGlzXG4gKi9cbk5vZGUucHJvdG90eXBlLnNldFBvc2l0aW9uID0gZnVuY3Rpb24gc2V0UG9zaXRpb24gKHgsIHksIHopIHtcbiAgICB2YXIgdmVjMyA9IHRoaXMudmFsdWUudmVjdG9ycy5wb3NpdGlvbjtcbiAgICB2YXIgcHJvcG9nYXRlID0gZmFsc2U7XG5cbiAgICBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMzLCAwLCB4KSB8fCBwcm9wb2dhdGU7XG4gICAgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjMywgMSwgeSkgfHwgcHJvcG9nYXRlO1xuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYzMsIDIsIHopIHx8IHByb3BvZ2F0ZTtcblxuICAgIGlmIChwcm9wb2dhdGUpIHtcbiAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICB2YXIgbGlzdCA9IHRoaXMuX2NvbXBvbmVudHM7XG4gICAgICAgIHZhciBsZW4gPSBsaXN0Lmxlbmd0aDtcbiAgICAgICAgdmFyIGl0ZW07XG4gICAgICAgIHggPSB2ZWMzWzBdO1xuICAgICAgICB5ID0gdmVjM1sxXTtcbiAgICAgICAgeiA9IHZlYzNbMl07XG4gICAgICAgIGZvciAoOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgICAgICBpdGVtID0gbGlzdFtpXTtcbiAgICAgICAgICAgIGlmIChpdGVtICYmIGl0ZW0ub25Qb3NpdGlvbkNoYW5nZSkgaXRlbS5vblBvc2l0aW9uQ2hhbmdlKHgsIHksIHopO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHJvdGF0aW9uIG9mIHRoZSBub2RlLiBXaWxsIGNhbGwgb25Sb3RhdGlvbkNoYW5nZVxuICogb24gYWxsIG9mIHRoZSBub2RlJ3MgY29tcG9uZW50cy4gVGhpcyBtZXRob2QgdGFrZXMgZWl0aGVyXG4gKiBFdWxlciBhbmdsZXMgb3IgYSBxdWF0ZXJuaW9uLiBJZiB0aGUgZm91cnRoIGFyZ3VtZW50IGlzIHVuZGVmaW5lZFxuICogRXVsZXIgYW5nbGVzIGFyZSBhc3N1bWVkLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0geCBFaXRoZXIgdGhlIHJvdGF0aW9uIGFyb3VuZCB0aGUgeCBheGlzIG9yIHRoZSBtYWduaXR1ZGUgaW4geCBvZiB0aGUgYXhpcyBvZiByb3RhdGlvbi5cbiAqIEBwYXJhbSB7TnVtYmVyfSB5IEVpdGhlciB0aGUgcm90YXRpb24gYXJvdW5kIHRoZSB5IGF4aXMgb3IgdGhlIG1hZ25pdHVkZSBpbiB5IG9mIHRoZSBheGlzIG9mIHJvdGF0aW9uLlxuICogQHBhcmFtIHtOdW1iZXJ9IHogRWl0aGVyIHRoZSByb3RhdGlvbiBhcm91bmQgdGhlIHogYXhpcyBvciB0aGUgbWFnbml0dWRlIGluIHogb2YgdGhlIGF4aXMgb2Ygcm90YXRpb24uXG4gKiBAcGFyYW0ge051bWJlcnx1bmRlZmluZWR9IHcgdGhlIGFtb3VudCBvZiByb3RhdGlvbiBhcm91bmQgdGhlIGF4aXMgb2Ygcm90YXRpb24sIGlmIGEgcXVhdGVybmlvbiBpcyBzcGVjaWZpZWQuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuTm9kZS5wcm90b3R5cGUuc2V0Um90YXRpb24gPSBmdW5jdGlvbiBzZXRSb3RhdGlvbiAoeCwgeSwgeiwgdykge1xuICAgIHZhciBxdWF0ID0gdGhpcy52YWx1ZS52ZWN0b3JzLnJvdGF0aW9uO1xuICAgIHZhciBwcm9wb2dhdGUgPSBmYWxzZTtcbiAgICB2YXIgcXgsIHF5LCBxeiwgcXc7XG5cbiAgICBpZiAodyAhPSBudWxsKSB7XG4gICAgICAgIHF4ID0geDtcbiAgICAgICAgcXkgPSB5O1xuICAgICAgICBxeiA9IHo7XG4gICAgICAgIHF3ID0gdztcbiAgICAgICAgdGhpcy5fbGFzdEV1bGVyWCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2xhc3RFdWxlclkgPSBudWxsO1xuICAgICAgICB0aGlzLl9sYXN0RXVsZXJaID0gbnVsbDtcbiAgICAgICAgdGhpcy5fbGFzdEV1bGVyID0gZmFsc2U7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZiAoeCA9PSBudWxsIHx8IHkgPT0gbnVsbCB8fCB6ID09IG51bGwpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9sYXN0RXVsZXIpIHtcbiAgICAgICAgICAgICAgICB4ID0geCA9PSBudWxsID8gdGhpcy5fbGFzdEV1bGVyWCA6IHg7XG4gICAgICAgICAgICAgICAgeSA9IHkgPT0gbnVsbCA/IHRoaXMuX2xhc3RFdWxlclkgOiB5O1xuICAgICAgICAgICAgICAgIHogPSB6ID09IG51bGwgPyB0aGlzLl9sYXN0RXVsZXJaIDogejtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBzcCA9IC0yICogKHF1YXRbMV0gKiBxdWF0WzJdIC0gcXVhdFszXSAqIHF1YXRbMF0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKE1hdGguYWJzKHNwKSA+IDAuOTk5OTkpIHtcbiAgICAgICAgICAgICAgICAgICAgeSA9IHkgPT0gbnVsbCA/IE1hdGguUEkgKiAwLjUgKiBzcCA6IHk7XG4gICAgICAgICAgICAgICAgICAgIHggPSB4ID09IG51bGwgPyBNYXRoLmF0YW4yKC1xdWF0WzBdICogcXVhdFsyXSArIHF1YXRbM10gKiBxdWF0WzFdLCAwLjUgLSBxdWF0WzFdICogcXVhdFsxXSAtIHF1YXRbMl0gKiBxdWF0WzJdKSA6IHg7XG4gICAgICAgICAgICAgICAgICAgIHogPSB6ID09IG51bGwgPyAwIDogejtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHkgPSB5ID09IG51bGwgPyBNYXRoLmFzaW4oc3ApIDogeTtcbiAgICAgICAgICAgICAgICAgICAgeCA9IHggPT0gbnVsbCA/IE1hdGguYXRhbjIocXVhdFswXSAqIHF1YXRbMl0gKyBxdWF0WzNdICogcXVhdFsxXSwgMC41IC0gcXVhdFswXSAqIHF1YXRbMF0gLSBxdWF0WzFdICogcXVhdFsxXSkgOiB4O1xuICAgICAgICAgICAgICAgICAgICB6ID0geiA9PSBudWxsID8gTWF0aC5hdGFuMihxdWF0WzBdICogcXVhdFsxXSArIHF1YXRbM10gKiBxdWF0WzJdLCAwLjUgLSBxdWF0WzBdICogcXVhdFswXSAtIHF1YXRbMl0gKiBxdWF0WzJdKSA6IHo7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGh4ID0geCAqIDAuNTtcbiAgICAgICAgdmFyIGh5ID0geSAqIDAuNTtcbiAgICAgICAgdmFyIGh6ID0geiAqIDAuNTtcblxuICAgICAgICB2YXIgc3ggPSBNYXRoLnNpbihoeCk7XG4gICAgICAgIHZhciBzeSA9IE1hdGguc2luKGh5KTtcbiAgICAgICAgdmFyIHN6ID0gTWF0aC5zaW4oaHopO1xuICAgICAgICB2YXIgY3ggPSBNYXRoLmNvcyhoeCk7XG4gICAgICAgIHZhciBjeSA9IE1hdGguY29zKGh5KTtcbiAgICAgICAgdmFyIGN6ID0gTWF0aC5jb3MoaHopO1xuXG4gICAgICAgIHZhciBzeXN6ID0gc3kgKiBzejtcbiAgICAgICAgdmFyIGN5c3ogPSBjeSAqIHN6O1xuICAgICAgICB2YXIgc3ljeiA9IHN5ICogY3o7XG4gICAgICAgIHZhciBjeWN6ID0gY3kgKiBjejtcblxuICAgICAgICBxeCA9IHN4ICogY3ljeiArIGN4ICogc3lzejtcbiAgICAgICAgcXkgPSBjeCAqIHN5Y3ogLSBzeCAqIGN5c3o7XG4gICAgICAgIHF6ID0gY3ggKiBjeXN6ICsgc3ggKiBzeWN6O1xuICAgICAgICBxdyA9IGN4ICogY3ljeiAtIHN4ICogc3lzejtcblxuICAgICAgICB0aGlzLl9sYXN0RXVsZXIgPSB0cnVlO1xuICAgICAgICB0aGlzLl9sYXN0RXVsZXJYID0geDtcbiAgICAgICAgdGhpcy5fbGFzdEV1bGVyWSA9IHk7XG4gICAgICAgIHRoaXMuX2xhc3RFdWxlclogPSB6O1xuICAgIH1cblxuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHF1YXQsIDAsIHF4KSB8fCBwcm9wb2dhdGU7XG4gICAgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQocXVhdCwgMSwgcXkpIHx8IHByb3BvZ2F0ZTtcbiAgICBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldChxdWF0LCAyLCBxeikgfHwgcHJvcG9nYXRlO1xuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHF1YXQsIDMsIHF3KSB8fCBwcm9wb2dhdGU7XG5cbiAgICBpZiAocHJvcG9nYXRlKSB7XG4gICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgdmFyIGxpc3QgPSB0aGlzLl9jb21wb25lbnRzO1xuICAgICAgICB2YXIgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgICAgIHZhciBpdGVtO1xuICAgICAgICB4ID0gcXVhdFswXTtcbiAgICAgICAgeSA9IHF1YXRbMV07XG4gICAgICAgIHogPSBxdWF0WzJdO1xuICAgICAgICB3ID0gcXVhdFszXTtcbiAgICAgICAgZm9yICg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgICAgIGl0ZW0gPSBsaXN0W2ldO1xuICAgICAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5vblJvdGF0aW9uQ2hhbmdlKSBpdGVtLm9uUm90YXRpb25DaGFuZ2UoeCwgeSwgeiwgdyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHNjYWxlIG9mIHRoZSBub2RlLiBUaGUgZGVmYXVsdCB2YWx1ZSBpcyAxIGluIGFsbCBkaW1lbnNpb25zLlxuICogVGhlIG5vZGUncyBjb21wb25lbnRzIHdpbGwgaGF2ZSBvblNjYWxlQ2hhbmdlZCBjYWxsZWQgb24gdGhlbS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggU2NhbGUgdmFsdWUgaW4geFxuICogQHBhcmFtIHtOdW1iZXJ9IHkgU2NhbGUgdmFsdWUgaW4geVxuICogQHBhcmFtIHtOdW1iZXJ9IHogU2NhbGUgdmFsdWUgaW4gelxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUuc2V0U2NhbGUgPSBmdW5jdGlvbiBzZXRTY2FsZSAoeCwgeSwgeikge1xuICAgIHZhciB2ZWMzID0gdGhpcy52YWx1ZS52ZWN0b3JzLnNjYWxlO1xuICAgIHZhciBwcm9wb2dhdGUgPSBmYWxzZTtcblxuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYzMsIDAsIHgpIHx8IHByb3BvZ2F0ZTtcbiAgICBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMzLCAxLCB5KSB8fCBwcm9wb2dhdGU7XG4gICAgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjMywgMiwgeikgfHwgcHJvcG9nYXRlO1xuXG4gICAgaWYgKHByb3BvZ2F0ZSkge1xuICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgIHZhciBsaXN0ID0gdGhpcy5fY29tcG9uZW50cztcbiAgICAgICAgdmFyIGxlbiA9IGxpc3QubGVuZ3RoO1xuICAgICAgICB2YXIgaXRlbTtcbiAgICAgICAgeCA9IHZlYzNbMF07XG4gICAgICAgIHkgPSB2ZWMzWzFdO1xuICAgICAgICB6ID0gdmVjM1syXTtcbiAgICAgICAgZm9yICg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgICAgIGl0ZW0gPSBsaXN0W2ldO1xuICAgICAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5vblNjYWxlQ2hhbmdlKSBpdGVtLm9uU2NhbGVDaGFuZ2UoeCwgeSwgeik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHZhbHVlIG9mIHRoZSBvcGFjaXR5IG9mIHRoaXMgbm9kZS4gQWxsIG9mIHRoZSBub2RlJ3NcbiAqIGNvbXBvbmVudHMgd2lsbCBoYXZlIG9uT3BhY2l0eUNoYW5nZSBjYWxsZWQgb24gdGhlbS9cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHZhbCBWYWx1ZSBvZiB0aGUgb3BhY2l0eS4gMSBpcyB0aGUgZGVmYXVsdC5cbiAqXG4gKiBAcmV0dXJuIHtOb2RlfSB0aGlzXG4gKi9cbk5vZGUucHJvdG90eXBlLnNldE9wYWNpdHkgPSBmdW5jdGlvbiBzZXRPcGFjaXR5ICh2YWwpIHtcbiAgICBpZiAodmFsICE9PSB0aGlzLnZhbHVlLnNob3dTdGF0ZS5vcGFjaXR5KSB7XG4gICAgICAgIHRoaXMudmFsdWUuc2hvd1N0YXRlLm9wYWNpdHkgPSB2YWw7XG4gICAgICAgIGlmICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSkgdGhpcy5fcmVxdWVzdFVwZGF0ZSgpO1xuXG4gICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgdmFyIGxpc3QgPSB0aGlzLl9jb21wb25lbnRzO1xuICAgICAgICB2YXIgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgICAgIHZhciBpdGVtO1xuICAgICAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICAgICAgaXRlbSA9IGxpc3RbaV07XG4gICAgICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uT3BhY2l0eUNoYW5nZSkgaXRlbS5vbk9wYWNpdHlDaGFuZ2UodmFsKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgc2l6ZSBtb2RlIGJlaW5nIHVzZWQgZm9yIGRldGVybWluaW5nIHRoZSBub2RlcyBmaW5hbCB3aWR0aCwgaGVpZ2h0XG4gKiBhbmQgZGVwdGguXG4gKiBTaXplIG1vZGVzIGFyZSBhIHdheSB0byBkZWZpbmUgdGhlIHdheSB0aGUgbm9kZSdzIHNpemUgaXMgYmVpbmcgY2FsY3VsYXRlZC5cbiAqIFNpemUgbW9kZXMgYXJlIGVudW1zIHNldCBvbiB0aGUgQHtAbGluayBTaXplfSBjb25zdHJ1Y3RvciAoYW5kIGFsaWFzZWQgb25cbiAqIHRoZSBOb2RlKS5cbiAqXG4gKiBAZXhhbXBsZVxuICogbm9kZS5zZXRTaXplTW9kZShOb2RlLlJFTEFUSVZFX1NJWkUsIE5vZGUuQUJTT0xVVEVfU0laRSwgTm9kZS5BQlNPTFVURV9TSVpFKTtcbiAqIC8vIEluc3RlYWQgb2YgbnVsbCwgYW55IHByb3BvcmlvbmFsIGhlaWdodCBvciBkZXB0aCBjYW4gYmUgcGFzc2VkIGluLCBzaW5jZVxuICogLy8gaXQgd291bGQgYmUgaWdub3JlZCBpbiBhbnkgY2FzZS5cbiAqIG5vZGUuc2V0UHJvcG9ydGlvbmFsU2l6ZSgwLjUsIG51bGwsIG51bGwpO1xuICogbm9kZS5zZXRBYnNvbHV0ZVNpemUobnVsbCwgMTAwLCAyMDApO1xuICpcbiAqIEBtZXRob2Qgc2V0U2l6ZU1vZGVcbiAqXG4gKiBAcGFyYW0ge1NpemVNb2RlfSB4ICAgIFRoZSBzaXplIG1vZGUgYmVpbmcgdXNlZCBmb3IgZGV0ZXJtaW5pbmcgdGhlIHNpemUgaW5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgeCBkaXJlY3Rpb24gKFwid2lkdGhcIikuXG4gKiBAcGFyYW0ge1NpemVNb2RlfSB5ICAgIFRoZSBzaXplIG1vZGUgYmVpbmcgdXNlZCBmb3IgZGV0ZXJtaW5pbmcgdGhlIHNpemUgaW5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgeSBkaXJlY3Rpb24gKFwiaGVpZ2h0XCIpLlxuICogQHBhcmFtIHtTaXplTW9kZX0geiAgICBUaGUgc2l6ZSBtb2RlIGJlaW5nIHVzZWQgZm9yIGRldGVybWluaW5nIHRoZSBzaXplIGluXG4gKiAgICAgICAgICAgICAgICAgICAgICAgIHogZGlyZWN0aW9uIChcImRlcHRoXCIpLlxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUuc2V0U2l6ZU1vZGUgPSBmdW5jdGlvbiBzZXRTaXplTW9kZSAoeCwgeSwgeikge1xuICAgIHZhciB2ZWMzID0gdGhpcy52YWx1ZS5zaXplLnNpemVNb2RlO1xuICAgIHZhciBwcm9wb2dhdGUgPSBmYWxzZTtcblxuICAgIGlmICh4ICE9IG51bGwpIHByb3BvZ2F0ZSA9IHRoaXMuX3Jlc29sdmVTaXplTW9kZSh2ZWMzLCAwLCB4KSB8fCBwcm9wb2dhdGU7XG4gICAgaWYgKHkgIT0gbnVsbCkgcHJvcG9nYXRlID0gdGhpcy5fcmVzb2x2ZVNpemVNb2RlKHZlYzMsIDEsIHkpIHx8IHByb3BvZ2F0ZTtcbiAgICBpZiAoeiAhPSBudWxsKSBwcm9wb2dhdGUgPSB0aGlzLl9yZXNvbHZlU2l6ZU1vZGUodmVjMywgMiwgeikgfHwgcHJvcG9nYXRlO1xuXG4gICAgaWYgKHByb3BvZ2F0ZSkge1xuICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgIHZhciBsaXN0ID0gdGhpcy5fY29tcG9uZW50cztcbiAgICAgICAgdmFyIGxlbiA9IGxpc3QubGVuZ3RoO1xuICAgICAgICB2YXIgaXRlbTtcbiAgICAgICAgeCA9IHZlYzNbMF07XG4gICAgICAgIHkgPSB2ZWMzWzFdO1xuICAgICAgICB6ID0gdmVjM1syXTtcbiAgICAgICAgZm9yICg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgICAgIGl0ZW0gPSBsaXN0W2ldO1xuICAgICAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5vblNpemVNb2RlQ2hhbmdlKSBpdGVtLm9uU2l6ZU1vZGVDaGFuZ2UoeCwgeSwgeik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEEgcHJvdGVjdGVkIG1ldGhvZCB0aGF0IHJlc29sdmVzIHN0cmluZyByZXByZXNlbnRhdGlvbnMgb2Ygc2l6ZSBtb2RlXG4gKiB0byBudW1lcmljIHZhbHVlcyBhbmQgYXBwbGllcyB0aGVtLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2ZWMgdGhlIGFycmF5IHRvIHdyaXRlIHNpemUgbW9kZSB0b1xuICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4IHRoZSBpbmRleCB0byB3cml0ZSB0byBpbiB0aGUgYXJyYXlcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gdmFsIHRoZSB2YWx1ZSB0byB3cml0ZVxuICpcbiAqIEByZXR1cm4ge0Jvb2x9IHdoZXRoZXIgb3Igbm90IHRoZSBzaXplbW9kZSBoYXMgYmVlbiBjaGFuZ2VkIGZvciB0aGlzIGluZGV4LlxuICovXG5Ob2RlLnByb3RvdHlwZS5fcmVzb2x2ZVNpemVNb2RlID0gZnVuY3Rpb24gX3Jlc29sdmVTaXplTW9kZSAodmVjLCBpbmRleCwgdmFsKSB7XG4gICAgaWYgKHZhbC5jb25zdHJ1Y3RvciA9PT0gU3RyaW5nKSB7XG4gICAgICAgIHN3aXRjaCAodmFsLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICAgIGNhc2UgJ3JlbGF0aXZlJzpcbiAgICAgICAgICAgIGNhc2UgJ2RlZmF1bHQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMsIGluZGV4LCAwKTtcbiAgICAgICAgICAgIGNhc2UgJ2Fic29sdXRlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjLCBpbmRleCwgMSk7XG4gICAgICAgICAgICBjYXNlICdyZW5kZXInOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMsIGluZGV4LCAyKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcigndW5rbm93biBzaXplIG1vZGU6ICcgKyB2YWwpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgcmV0dXJuIHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYywgaW5kZXgsIHZhbCk7XG59O1xuXG4vKipcbiAqIEEgcHJvcG9ydGlvbmFsIHNpemUgZGVmaW5lcyB0aGUgbm9kZSdzIGRpbWVuc2lvbnMgcmVsYXRpdmUgdG8gaXRzIHBhcmVudHNcbiAqIGZpbmFsIHNpemUuXG4gKiBQcm9wb3J0aW9uYWwgc2l6ZXMgbmVlZCB0byBiZSB3aXRoaW4gdGhlIHJhbmdlIG9mIFswLCAxXS5cbiAqXG4gKiBAbWV0aG9kIHNldFByb3BvcnRpb25hbFNpemVcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0geCAgICB4LVNpemUgaW4gcGl4ZWxzIChcIndpZHRoXCIpLlxuICogQHBhcmFtIHtOdW1iZXJ9IHkgICAgeS1TaXplIGluIHBpeGVscyAoXCJoZWlnaHRcIikuXG4gKiBAcGFyYW0ge051bWJlcn0geiAgICB6LVNpemUgaW4gcGl4ZWxzIChcImRlcHRoXCIpLlxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUuc2V0UHJvcG9ydGlvbmFsU2l6ZSA9IGZ1bmN0aW9uIHNldFByb3BvcnRpb25hbFNpemUgKHgsIHksIHopIHtcbiAgICB2YXIgdmVjMyA9IHRoaXMudmFsdWUuc2l6ZS5wcm9wb3J0aW9uYWw7XG4gICAgdmFyIHByb3BvZ2F0ZSA9IGZhbHNlO1xuXG4gICAgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjMywgMCwgeCkgfHwgcHJvcG9nYXRlO1xuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYzMsIDEsIHkpIHx8IHByb3BvZ2F0ZTtcbiAgICBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMzLCAyLCB6KSB8fCBwcm9wb2dhdGU7XG5cbiAgICBpZiAocHJvcG9nYXRlKSB7XG4gICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgdmFyIGxpc3QgPSB0aGlzLl9jb21wb25lbnRzO1xuICAgICAgICB2YXIgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgICAgIHZhciBpdGVtO1xuICAgICAgICB4ID0gdmVjM1swXTtcbiAgICAgICAgeSA9IHZlYzNbMV07XG4gICAgICAgIHogPSB2ZWMzWzJdO1xuICAgICAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICAgICAgaXRlbSA9IGxpc3RbaV07XG4gICAgICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uUHJvcG9ydGlvbmFsU2l6ZUNoYW5nZSkgaXRlbS5vblByb3BvcnRpb25hbFNpemVDaGFuZ2UoeCwgeSwgeik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERpZmZlcmVudGlhbCBzaXppbmcgY2FuIGJlIHVzZWQgdG8gYWRkIG9yIHN1YnRyYWN0IGFuIGFic29sdXRlIHNpemUgZnJvbSBhXG4gKiBvdGhlcndpc2UgcHJvcG9ydGlvbmFsbHkgc2l6ZWQgbm9kZS5cbiAqIEUuZy4gYSBkaWZmZXJlbnRpYWwgd2lkdGggb2YgYC0xMGAgYW5kIGEgcHJvcG9ydGlvbmFsIHdpZHRoIG9mIGAwLjVgIGlzXG4gKiBiZWluZyBpbnRlcnByZXRlZCBhcyBzZXR0aW5nIHRoZSBub2RlJ3Mgc2l6ZSB0byA1MCUgb2YgaXRzIHBhcmVudCdzIHdpZHRoXG4gKiAqbWludXMqIDEwIHBpeGVscy5cbiAqXG4gKiBAbWV0aG9kIHNldERpZmZlcmVudGlhbFNpemVcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0geCAgICB4LVNpemUgdG8gYmUgYWRkZWQgdG8gdGhlIHJlbGF0aXZlbHkgc2l6ZWQgbm9kZSBpblxuICogICAgICAgICAgICAgICAgICAgICAgcGl4ZWxzIChcIndpZHRoXCIpLlxuICogQHBhcmFtIHtOdW1iZXJ9IHkgICAgeS1TaXplIHRvIGJlIGFkZGVkIHRvIHRoZSByZWxhdGl2ZWx5IHNpemVkIG5vZGUgaW5cbiAqICAgICAgICAgICAgICAgICAgICAgIHBpeGVscyAoXCJoZWlnaHRcIikuXG4gKiBAcGFyYW0ge051bWJlcn0geiAgICB6LVNpemUgdG8gYmUgYWRkZWQgdG8gdGhlIHJlbGF0aXZlbHkgc2l6ZWQgbm9kZSBpblxuICogICAgICAgICAgICAgICAgICAgICAgcGl4ZWxzIChcImRlcHRoXCIpLlxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUuc2V0RGlmZmVyZW50aWFsU2l6ZSA9IGZ1bmN0aW9uIHNldERpZmZlcmVudGlhbFNpemUgKHgsIHksIHopIHtcbiAgICB2YXIgdmVjMyA9IHRoaXMudmFsdWUuc2l6ZS5kaWZmZXJlbnRpYWw7XG4gICAgdmFyIHByb3BvZ2F0ZSA9IGZhbHNlO1xuXG4gICAgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjMywgMCwgeCkgfHwgcHJvcG9nYXRlO1xuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYzMsIDEsIHkpIHx8IHByb3BvZ2F0ZTtcbiAgICBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMzLCAyLCB6KSB8fCBwcm9wb2dhdGU7XG5cbiAgICBpZiAocHJvcG9nYXRlKSB7XG4gICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgdmFyIGxpc3QgPSB0aGlzLl9jb21wb25lbnRzO1xuICAgICAgICB2YXIgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgICAgIHZhciBpdGVtO1xuICAgICAgICB4ID0gdmVjM1swXTtcbiAgICAgICAgeSA9IHZlYzNbMV07XG4gICAgICAgIHogPSB2ZWMzWzJdO1xuICAgICAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICAgICAgaXRlbSA9IGxpc3RbaV07XG4gICAgICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uRGlmZmVyZW50aWFsU2l6ZUNoYW5nZSkgaXRlbS5vbkRpZmZlcmVudGlhbFNpemVDaGFuZ2UoeCwgeSwgeik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIG5vZGVzIHNpemUgaW4gcGl4ZWxzLCBpbmRlcGVuZGVudCBvZiBpdHMgcGFyZW50LlxuICpcbiAqIEBtZXRob2Qgc2V0QWJzb2x1dGVTaXplXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggICAgeC1TaXplIGluIHBpeGVscyAoXCJ3aWR0aFwiKS5cbiAqIEBwYXJhbSB7TnVtYmVyfSB5ICAgIHktU2l6ZSBpbiBwaXhlbHMgKFwiaGVpZ2h0XCIpLlxuICogQHBhcmFtIHtOdW1iZXJ9IHogICAgei1TaXplIGluIHBpeGVscyAoXCJkZXB0aFwiKS5cbiAqXG4gKiBAcmV0dXJuIHtOb2RlfSB0aGlzXG4gKi9cbk5vZGUucHJvdG90eXBlLnNldEFic29sdXRlU2l6ZSA9IGZ1bmN0aW9uIHNldEFic29sdXRlU2l6ZSAoeCwgeSwgeikge1xuICAgIHZhciB2ZWMzID0gdGhpcy52YWx1ZS5zaXplLmFic29sdXRlO1xuICAgIHZhciBwcm9wb2dhdGUgPSBmYWxzZTtcblxuICAgIHByb3BvZ2F0ZSA9IHRoaXMuX3ZlY09wdGlvbmFsU2V0KHZlYzMsIDAsIHgpIHx8IHByb3BvZ2F0ZTtcbiAgICBwcm9wb2dhdGUgPSB0aGlzLl92ZWNPcHRpb25hbFNldCh2ZWMzLCAxLCB5KSB8fCBwcm9wb2dhdGU7XG4gICAgcHJvcG9nYXRlID0gdGhpcy5fdmVjT3B0aW9uYWxTZXQodmVjMywgMiwgeikgfHwgcHJvcG9nYXRlO1xuXG4gICAgaWYgKHByb3BvZ2F0ZSkge1xuICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgIHZhciBsaXN0ID0gdGhpcy5fY29tcG9uZW50cztcbiAgICAgICAgdmFyIGxlbiA9IGxpc3QubGVuZ3RoO1xuICAgICAgICB2YXIgaXRlbTtcbiAgICAgICAgeCA9IHZlYzNbMF07XG4gICAgICAgIHkgPSB2ZWMzWzFdO1xuICAgICAgICB6ID0gdmVjM1syXTtcbiAgICAgICAgZm9yICg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgICAgIGl0ZW0gPSBsaXN0W2ldO1xuICAgICAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5vbkFic29sdXRlU2l6ZUNoYW5nZSkgaXRlbS5vbkFic29sdXRlU2l6ZUNoYW5nZSh4LCB5LCB6KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUHJpdmF0ZSBtZXRob2QgZm9yIGFsZXJ0aW5nIGFsbCBjb21wb25lbnRzIGFuZCBjaGlsZHJlbiB0aGF0XG4gKiB0aGlzIG5vZGUncyB0cmFuc2Zvcm0gaGFzIGNoYW5nZWQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7RmxvYXQzMkFycmF5fSB0cmFuc2Zvcm0gVGhlIHRyYW5zZm9ybSB0aGF0IGhhcyBjaGFuZ2VkXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuTm9kZS5wcm90b3R5cGUuX3RyYW5zZm9ybUNoYW5nZWQgPSBmdW5jdGlvbiBfdHJhbnNmb3JtQ2hhbmdlZCAodHJhbnNmb3JtKSB7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBpdGVtcyA9IHRoaXMuX2NvbXBvbmVudHM7XG4gICAgdmFyIGxlbiA9IGl0ZW1zLmxlbmd0aDtcbiAgICB2YXIgaXRlbTtcblxuICAgIGZvciAoOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgIGl0ZW0gPSBpdGVtc1tpXTtcbiAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5vblRyYW5zZm9ybUNoYW5nZSkgaXRlbS5vblRyYW5zZm9ybUNoYW5nZSh0cmFuc2Zvcm0pO1xuICAgIH1cblxuICAgIGkgPSAwO1xuICAgIGl0ZW1zID0gdGhpcy5fY2hpbGRyZW47XG4gICAgbGVuID0gaXRlbXMubGVuZ3RoO1xuXG4gICAgZm9yICg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgaXRlbSA9IGl0ZW1zW2ldO1xuICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uUGFyZW50VHJhbnNmb3JtQ2hhbmdlKSBpdGVtLm9uUGFyZW50VHJhbnNmb3JtQ2hhbmdlKHRyYW5zZm9ybSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBQcml2YXRlIG1ldGhvZCBmb3IgYWxlcnRpbmcgYWxsIGNvbXBvbmVudHMgYW5kIGNoaWxkcmVuIHRoYXRcbiAqIHRoaXMgbm9kZSdzIHNpemUgaGFzIGNoYW5nZWQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7RmxvYXQzMkFycmF5fSBzaXplIHRoZSBzaXplIHRoYXQgaGFzIGNoYW5nZWRcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Ob2RlLnByb3RvdHlwZS5fc2l6ZUNoYW5nZWQgPSBmdW5jdGlvbiBfc2l6ZUNoYW5nZWQgKHNpemUpIHtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGl0ZW1zID0gdGhpcy5fY29tcG9uZW50cztcbiAgICB2YXIgbGVuID0gaXRlbXMubGVuZ3RoO1xuICAgIHZhciBpdGVtO1xuXG4gICAgZm9yICg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgaXRlbSA9IGl0ZW1zW2ldO1xuICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uU2l6ZUNoYW5nZSkgaXRlbS5vblNpemVDaGFuZ2Uoc2l6ZSk7XG4gICAgfVxuXG4gICAgaSA9IDA7XG4gICAgaXRlbXMgPSB0aGlzLl9jaGlsZHJlbjtcbiAgICBsZW4gPSBpdGVtcy5sZW5ndGg7XG5cbiAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICBpdGVtID0gaXRlbXNbaV07XG4gICAgICAgIGlmIChpdGVtICYmIGl0ZW0ub25QYXJlbnRTaXplQ2hhbmdlKSBpdGVtLm9uUGFyZW50U2l6ZUNoYW5nZShzaXplKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIE1ldGhvZCBmb3IgZ2V0dGluZyB0aGUgY3VycmVudCBmcmFtZS4gV2lsbCBiZSBkZXByaWNhdGVkLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IGN1cnJlbnQgZnJhbWVcbiAqL1xuTm9kZS5wcm90b3R5cGUuZ2V0RnJhbWUgPSBmdW5jdGlvbiBnZXRGcmFtZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2dsb2JhbFVwZGF0ZXIuZ2V0RnJhbWUoKTtcbn07XG5cbi8qKlxuICogcmV0dXJucyBhbiBhcnJheSBvZiB0aGUgY29tcG9uZW50cyBjdXJyZW50bHkgYXR0YWNoZWQgdG8gdGhpc1xuICogbm9kZS5cbiAqXG4gKiBAbWV0aG9kIGdldENvbXBvbmVudHNcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gbGlzdCBvZiBjb21wb25lbnRzLlxuICovXG5Ob2RlLnByb3RvdHlwZS5nZXRDb21wb25lbnRzID0gZnVuY3Rpb24gZ2V0Q29tcG9uZW50cyAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbXBvbmVudHM7XG59O1xuXG4vKipcbiAqIEVudGVycyB0aGUgbm9kZSdzIHVwZGF0ZSBwaGFzZSB3aGlsZSB1cGRhdGluZyBpdHMgb3duIHNwZWMgYW5kIHVwZGF0aW5nIGl0cyBjb21wb25lbnRzLlxuICpcbiAqIEBtZXRob2QgdXBkYXRlXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSB0aW1lICAgIGhpZ2gtcmVzb2x1dGlvbiB0aW1zdGFtcCwgdXN1YWxseSByZXRyaWV2ZWQgdXNpbmdcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAqXG4gKiBAcmV0dXJuIHtOb2RlfSB0aGlzXG4gKi9cbk5vZGUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSAodGltZSl7XG4gICAgdGhpcy5faW5VcGRhdGUgPSB0cnVlO1xuICAgIHZhciBuZXh0UXVldWUgPSB0aGlzLl9uZXh0VXBkYXRlUXVldWU7XG4gICAgdmFyIHF1ZXVlID0gdGhpcy5fdXBkYXRlUXVldWU7XG4gICAgdmFyIGl0ZW07XG5cbiAgICB3aGlsZSAobmV4dFF1ZXVlLmxlbmd0aCkgcXVldWUudW5zaGlmdChuZXh0UXVldWUucG9wKCkpO1xuXG4gICAgd2hpbGUgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBpdGVtID0gdGhpcy5fY29tcG9uZW50c1txdWV1ZS5zaGlmdCgpXTtcbiAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5vblVwZGF0ZSkgaXRlbS5vblVwZGF0ZSh0aW1lKTtcbiAgICB9XG5cbiAgICB2YXIgbXlTaXplID0gdGhpcy5nZXRTaXplKCk7XG4gICAgdmFyIG15VHJhbnNmb3JtID0gdGhpcy5nZXRUcmFuc2Zvcm0oKTtcbiAgICB2YXIgcGFyZW50ID0gdGhpcy5nZXRQYXJlbnQoKTtcbiAgICB2YXIgcGFyZW50U2l6ZSA9IHBhcmVudC5nZXRTaXplKCk7XG4gICAgdmFyIHBhcmVudFRyYW5zZm9ybSA9IHBhcmVudC5nZXRUcmFuc2Zvcm0oKTtcbiAgICB2YXIgc2l6ZUNoYW5nZWQgPSBTSVpFX1BST0NFU1NPUi5mcm9tU3BlY1dpdGhQYXJlbnQocGFyZW50U2l6ZSwgdGhpcywgbXlTaXplKTtcblxuICAgIHZhciB0cmFuc2Zvcm1DaGFuZ2VkID0gVFJBTlNGT1JNX1BST0NFU1NPUi5mcm9tU3BlY1dpdGhQYXJlbnQocGFyZW50VHJhbnNmb3JtLCB0aGlzLnZhbHVlLCBteVNpemUsIHBhcmVudFNpemUsIG15VHJhbnNmb3JtKTtcbiAgICBpZiAodHJhbnNmb3JtQ2hhbmdlZCkgdGhpcy5fdHJhbnNmb3JtQ2hhbmdlZChteVRyYW5zZm9ybSk7XG4gICAgaWYgKHNpemVDaGFuZ2VkKSB0aGlzLl9zaXplQ2hhbmdlZChteVNpemUpO1xuXG4gICAgdGhpcy5faW5VcGRhdGUgPSBmYWxzZTtcbiAgICB0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlID0gZmFsc2U7XG5cbiAgICBpZiAoIXRoaXMuaXNNb3VudGVkKCkpIHtcbiAgICAgICAgLy8gbGFzdCB1cGRhdGVcbiAgICAgICAgdGhpcy5fcGFyZW50ID0gbnVsbDtcbiAgICAgICAgdGhpcy52YWx1ZS5sb2NhdGlvbiA9IG51bGw7XG4gICAgICAgIHRoaXMuX2dsb2JhbFVwZGF0ZXIgPSBudWxsO1xuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLl9uZXh0VXBkYXRlUXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuX2dsb2JhbFVwZGF0ZXIucmVxdWVzdFVwZGF0ZU9uTmV4dFRpY2sodGhpcyk7XG4gICAgICAgIHRoaXMuX3JlcXVlc3RpbmdVcGRhdGUgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogTW91bnRzIHRoZSBub2RlIGFuZCB0aGVyZWZvcmUgaXRzIHN1YnRyZWUgYnkgc2V0dGluZyBpdCBhcyBhIGNoaWxkIG9mIHRoZVxuICogcGFzc2VkIGluIHBhcmVudC5cbiAqXG4gKiBAbWV0aG9kIG1vdW50XG4gKlxuICogQHBhcmFtICB7Tm9kZX0gcGFyZW50ICAgIHBhcmVudCBub2RlXG4gKiBAcGFyYW0gIHtTdHJpbmd9IG15SWQgICAgcGF0aCB0byBub2RlIChlLmcuIGBib2R5LzAvMWApXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5tb3VudCA9IGZ1bmN0aW9uIG1vdW50IChwYXJlbnQsIG15SWQpIHtcbiAgICBpZiAodGhpcy5pc01vdW50ZWQoKSkgcmV0dXJuIHRoaXM7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBsaXN0ID0gdGhpcy5fY29tcG9uZW50cztcbiAgICB2YXIgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgdmFyIGl0ZW07XG5cbiAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5fZ2xvYmFsVXBkYXRlciA9IHBhcmVudC5nZXRVcGRhdGVyKCk7XG4gICAgdGhpcy52YWx1ZS5sb2NhdGlvbiA9IG15SWQ7XG4gICAgdGhpcy52YWx1ZS5zaG93U3RhdGUubW91bnRlZCA9IHRydWU7XG5cbiAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICBpdGVtID0gbGlzdFtpXTtcbiAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5vbk1vdW50KSBpdGVtLm9uTW91bnQodGhpcywgaSk7XG4gICAgfVxuXG4gICAgaSA9IDA7XG4gICAgbGlzdCA9IHRoaXMuX2NoaWxkcmVuO1xuICAgIGxlbiA9IGxpc3QubGVuZ3RoO1xuICAgIGZvciAoOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgIGl0ZW0gPSBsaXN0W2ldO1xuICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uUGFyZW50TW91bnQpIGl0ZW0ub25QYXJlbnRNb3VudCh0aGlzLCBteUlkLCBpKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX3JlcXVlc3RpbmdVcGRhdGUpIHRoaXMuX3JlcXVlc3RVcGRhdGUodHJ1ZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERpc21vdW50cyAoZGV0YWNoZXMpIHRoZSBub2RlIGZyb20gdGhlIHNjZW5lIGdyYXBoIGJ5IHJlbW92aW5nIGl0IGFzIGFcbiAqIGNoaWxkIG9mIGl0cyBwYXJlbnQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUuZGlzbW91bnQgPSBmdW5jdGlvbiBkaXNtb3VudCAoKSB7XG4gICAgaWYgKCF0aGlzLmlzTW91bnRlZCgpKSByZXR1cm4gdGhpcztcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGxpc3QgPSB0aGlzLl9jb21wb25lbnRzO1xuICAgIHZhciBsZW4gPSBsaXN0Lmxlbmd0aDtcbiAgICB2YXIgaXRlbTtcblxuICAgIHRoaXMudmFsdWUuc2hvd1N0YXRlLm1vdW50ZWQgPSBmYWxzZTtcblxuICAgIHRoaXMuX3BhcmVudC5yZW1vdmVDaGlsZCh0aGlzKTtcblxuICAgIGZvciAoOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgIGl0ZW0gPSBsaXN0W2ldO1xuICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLm9uRGlzbW91bnQpIGl0ZW0ub25EaXNtb3VudCgpO1xuICAgIH1cblxuICAgIGkgPSAwO1xuICAgIGxpc3QgPSB0aGlzLl9jaGlsZHJlbjtcbiAgICBsZW4gPSBsaXN0Lmxlbmd0aDtcbiAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICBpdGVtID0gbGlzdFtpXTtcbiAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5vblBhcmVudERpc21vdW50KSBpdGVtLm9uUGFyZW50RGlzbW91bnQoKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX3JlcXVlc3RpbmdVcGRhdGUpIHRoaXMuX3JlcXVlc3RVcGRhdGUoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRnVuY3Rpb24gdG8gYmUgaW52b2tlZCBieSB0aGUgcGFyZW50IGFzIHNvb24gYXMgdGhlIHBhcmVudCBpc1xuICogYmVpbmcgbW91bnRlZC5cbiAqXG4gKiBAbWV0aG9kIG9uUGFyZW50TW91bnRcbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBwYXJlbnQgICAgICAgIFRoZSBwYXJlbnQgbm9kZS5cbiAqIEBwYXJhbSAge1N0cmluZ30gcGFyZW50SWQgICAgVGhlIHBhcmVudCBpZCAocGF0aCB0byBwYXJlbnQpLlxuICogQHBhcmFtICB7TnVtYmVyfSBpbmRleCAgICAgICBJZCB0aGUgbm9kZSBzaG91bGQgYmUgbW91bnRlZCB0by5cbiAqXG4gKiBAcmV0dXJuIHtOb2RlfSB0aGlzXG4gKi9cbk5vZGUucHJvdG90eXBlLm9uUGFyZW50TW91bnQgPSBmdW5jdGlvbiBvblBhcmVudE1vdW50IChwYXJlbnQsIHBhcmVudElkLCBpbmRleCkge1xuICAgIHJldHVybiB0aGlzLm1vdW50KHBhcmVudCwgcGFyZW50SWQgKyAnLycgKyBpbmRleCk7XG59O1xuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIGJlIGludm9rZWQgYnkgdGhlIHBhcmVudCBhcyBzb29uIGFzIHRoZSBwYXJlbnQgaXMgYmVpbmdcbiAqIHVubW91bnRlZC5cbiAqXG4gKiBAbWV0aG9kIG9uUGFyZW50RGlzbW91bnRcbiAqXG4gKiBAcmV0dXJuIHtOb2RlfSB0aGlzXG4gKi9cbk5vZGUucHJvdG90eXBlLm9uUGFyZW50RGlzbW91bnQgPSBmdW5jdGlvbiBvblBhcmVudERpc21vdW50ICgpIHtcbiAgICByZXR1cm4gdGhpcy5kaXNtb3VudCgpO1xufTtcblxuLyoqXG4gKiBNZXRob2QgdG8gYmUgY2FsbGVkIGluIG9yZGVyIHRvIGRpc3BhdGNoIGFuIGV2ZW50IHRvIHRoZSBub2RlIGFuZCBhbGwgaXRzXG4gKiBjb21wb25lbnRzLiBOb3RlIHRoYXQgdGhpcyBkb2Vzbid0IHJlY3Vyc2UgdGhlIHN1YnRyZWUuXG4gKlxuICogQG1ldGhvZCByZWNlaXZlXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSB0eXBlICAgVGhlIGV2ZW50IHR5cGUgKGUuZy4gXCJjbGlja1wiKS5cbiAqIEBwYXJhbSAge09iamVjdH0gZXYgICAgIFRoZSBldmVudCBwYXlsb2FkIG9iamVjdCB0byBiZSBkaXNwYXRjaGVkLlxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUucmVjZWl2ZSA9IGZ1bmN0aW9uIHJlY2VpdmUgKHR5cGUsIGV2KSB7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBsaXN0ID0gdGhpcy5fY29tcG9uZW50cztcbiAgICB2YXIgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgdmFyIGl0ZW07XG4gICAgZm9yICg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgaXRlbSA9IGxpc3RbaV07XG4gICAgICAgIGlmIChpdGVtICYmIGl0ZW0ub25SZWNlaXZlKSBpdGVtLm9uUmVjZWl2ZSh0eXBlLCBldik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiAqIFByaXZhdGUgbWV0aG9kIHRvIGF2b2lkIGFjY2lkZW50YWxseSBwYXNzaW5nIGFyZ3VtZW50c1xuICogdG8gdXBkYXRlIGV2ZW50cy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuTm9kZS5wcm90b3R5cGUuX3JlcXVlc3RVcGRhdGVXaXRob3V0QXJncyA9IGZ1bmN0aW9uIF9yZXF1ZXN0VXBkYXRlV2l0aG91dEFyZ3MgKCkge1xuICAgIGlmICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSkgdGhpcy5fcmVxdWVzdFVwZGF0ZSgpO1xufTtcblxuLyoqXG4gKiBBIG1ldGhvZCB0byBleGVjdXRlIGxvZ2ljIG9uIHVwZGF0ZS4gRGVmYXVsdHMgdG8gdGhlXG4gKiBub2RlJ3MgLnVwZGF0ZSBtZXRob2QuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBjdXJyZW50IHRpbWVcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Ob2RlLnByb3RvdHlwZS5vblVwZGF0ZSA9IE5vZGUucHJvdG90eXBlLnVwZGF0ZTtcblxuLyoqXG4gKiBBIG1ldGhvZCB0byBleGVjdXRlIGxvZ2ljIHdoZW4gYSBwYXJlbnQgbm9kZSBpcyBzaG93bi4gRGVsZWdhdGVzXG4gKiB0byBOb2RlLnNob3cuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUub25QYXJlbnRTaG93ID0gTm9kZS5wcm90b3R5cGUuc2hvdztcblxuLyoqXG4gKiBBIG1ldGhvZCB0byBleGVjdXRlIGxvZ2ljIHdoZW4gdGhlIHBhcmVudCBpcyBoaWRkZW4uIERlbGVnYXRlc1xuICogdG8gTm9kZS5oaWRlLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtOb2RlfSB0aGlzXG4gKi9cbk5vZGUucHJvdG90eXBlLm9uUGFyZW50SGlkZSA9IE5vZGUucHJvdG90eXBlLmhpZGU7XG5cbi8qKlxuICogQSBtZXRob2QgdG8gZXhlY3V0ZSBsb2dpYyB3aGVuIHRoZSBwYXJlbnQgdHJhbnNmb3JtIGNoYW5nZXMuXG4gKiBEZWxlZ2F0ZXMgdG8gTm9kZS5fcmVxdWVzdFVwZGF0ZVdpdGhvdXRBcmdzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Ob2RlLnByb3RvdHlwZS5vblBhcmVudFRyYW5zZm9ybUNoYW5nZSA9IE5vZGUucHJvdG90eXBlLl9yZXF1ZXN0VXBkYXRlV2l0aG91dEFyZ3M7XG5cbi8qKlxuICogQSBtZXRob2QgdG8gZXhlY3V0ZSBsb2dpYyB3aGVuIHRoZSBwYXJlbnQgc2l6ZSBjaGFuZ2VzLlxuICogRGVsZWdhdGVzIHRvIE5vZGUuX3JlcXVlc3RVcGRhdGVXSXRob3V0QXJncy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuTm9kZS5wcm90b3R5cGUub25QYXJlbnRTaXplQ2hhbmdlID0gTm9kZS5wcm90b3R5cGUuX3JlcXVlc3RVcGRhdGVXaXRob3V0QXJncztcblxuLyoqXG4gKiBBIG1ldGhvZCB0byBleGVjdXRlIGxvZ2ljIHdoZW4gdGhlIG5vZGUgc29tZXRoaW5nIHdhbnRzXG4gKiB0byBzaG93IHRoZSBub2RlLiBEZWxlZ2F0ZXMgdG8gTm9kZS5zaG93LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtOb2RlfSB0aGlzXG4gKi9cbk5vZGUucHJvdG90eXBlLm9uU2hvdyA9IE5vZGUucHJvdG90eXBlLnNob3c7XG5cbi8qKlxuICogQSBtZXRob2QgdG8gZXhlY3V0ZSBsb2dpYyB3aGVuIHNvbWV0aGluZyB3YW50cyB0byBoaWRlIHRoaXNcbiAqIG5vZGUuIERlbGVnYXRlcyB0byBOb2RlLmhpZGUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUub25IaWRlID0gTm9kZS5wcm90b3R5cGUuaGlkZTtcblxuLyoqXG4gKiBBIG1ldGhvZCB3aGljaCBjYW4gZXhlY3V0ZSBsb2dpYyB3aGVuIHRoaXMgbm9kZSBpcyBhZGRlZCB0b1xuICogdG8gdGhlIHNjZW5lIGdyYXBoLiBEZWxlZ2F0ZXMgdG8gbW91bnQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge05vZGV9IHRoaXNcbiAqL1xuTm9kZS5wcm90b3R5cGUub25Nb3VudCA9IE5vZGUucHJvdG90eXBlLm1vdW50O1xuXG4vKipcbiAqIEEgbWV0aG9kIHdoaWNoIGNhbiBleGVjdXRlIGxvZ2ljIHdoZW4gdGhpcyBub2RlIGlzIHJlbW92ZWQgZnJvbVxuICogdGhlIHNjZW5lIGdyYXBoLiBEZWxlZ2F0ZXMgdG8gTm9kZS5kaXNtb3VudC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7Tm9kZX0gdGhpc1xuICovXG5Ob2RlLnByb3RvdHlwZS5vbkRpc21vdW50ID0gTm9kZS5wcm90b3R5cGUuZGlzbW91bnQ7XG5cbi8qKlxuICogQSBtZXRob2Qgd2hpY2ggY2FuIGV4ZWN1dGUgbG9naWMgd2hlbiB0aGlzIG5vZGUgcmVjZWl2ZXNcbiAqIGFuIGV2ZW50IGZyb20gdGhlIHNjZW5lIGdyYXBoLiBEZWxlZ2F0ZXMgdG8gTm9kZS5yZWNlaXZlLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgbmFtZVxuICogQHBhcmFtIHtPYmplY3R9IHBheWxvYWRcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Ob2RlLnByb3RvdHlwZS5vblJlY2VpdmUgPSBOb2RlLnByb3RvdHlwZS5yZWNlaXZlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE5vZGU7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICogXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICogXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKiBcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqIFxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuLypqc2hpbnQgLVcwNzkgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRGlzcGF0Y2ggPSByZXF1aXJlKCcuL0Rpc3BhdGNoJyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4vTm9kZScpO1xudmFyIFNpemUgPSByZXF1aXJlKCcuL1NpemUnKTtcblxuLyoqXG4gKiBTY2VuZSBpcyB0aGUgYm90dG9tIG9mIHRoZSBzY2VuZSBncmFwaC4gSXQgaXMgaXQncyBvd25cbiAqIHBhcmVudCBhbmQgcHJvdmlkZXMgdGhlIGdsb2JhbCB1cGRhdGVyIHRvIHRoZSBzY2VuZSBncmFwaC5cbiAqXG4gKiBAY2xhc3MgU2NlbmVcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzZWxlY3RvciBhIHN0cmluZyB3aGljaCBpcyBhIGRvbSBzZWxlY3RvclxuICogICAgICAgICAgICAgICAgIHNpZ25pZnlpbmcgd2hpY2ggZG9tIGVsZW1lbnQgdGhlIGNvbnRleHRcbiAqICAgICAgICAgICAgICAgICBzaG91bGQgYmUgc2V0IHVwb25cbiAqIEBwYXJhbSB7RmFtb3VzfSB1cGRhdGVyIGEgY2xhc3Mgd2hpY2ggY29uZm9ybXMgdG8gRmFtb3VzJyBpbnRlcmZhY2VcbiAqICAgICAgICAgICAgICAgICBpdCBuZWVkcyB0byBiZSBhYmxlIHRvIHNlbmQgbWV0aG9kcyB0b1xuICogICAgICAgICAgICAgICAgIHRoZSByZW5kZXJlcnMgYW5kIHVwZGF0ZSBub2RlcyBpbiB0aGUgc2NlbmUgZ3JhcGhcbiAqL1xuZnVuY3Rpb24gU2NlbmUgKHNlbGVjdG9yLCB1cGRhdGVyKSB7XG4gICAgaWYgKCFzZWxlY3RvcikgdGhyb3cgbmV3IEVycm9yKCdTY2VuZSBuZWVkcyB0byBiZSBjcmVhdGVkIHdpdGggYSBET00gc2VsZWN0b3InKTtcbiAgICBpZiAoIXVwZGF0ZXIpIHRocm93IG5ldyBFcnJvcignU2NlbmUgbmVlZHMgdG8gYmUgY3JlYXRlZCB3aXRoIGEgY2xhc3MgbGlrZSBGYW1vdXMnKTtcblxuICAgIE5vZGUuY2FsbCh0aGlzKTsgICAgICAgICAvLyBTY2VuZSBpbmhlcml0cyBmcm9tIG5vZGVcblxuICAgIHRoaXMuX3VwZGF0ZXIgPSB1cGRhdGVyOyAvLyBUaGUgdXBkYXRlciB0aGF0IHdpbGwgYm90aFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzZW5kIG1lc3NhZ2VzIHRvIHRoZSByZW5kZXJlcnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYW5kIHVwZGF0ZSBkaXJ0eSBub2RlcyBcblxuICAgIHRoaXMuX2Rpc3BhdGNoID0gbmV3IERpc3BhdGNoKHRoaXMpOyAvLyBpbnN0YW50aWF0ZXMgYSBkaXNwYXRjaGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRvIHNlbmQgZXZlbnRzIHRvIHRoZSBzY2VuZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBncmFwaCBiZWxvdyB0aGlzIGNvbnRleHRcbiAgICBcbiAgICB0aGlzLl9zZWxlY3RvciA9IHNlbGVjdG9yOyAvLyByZWZlcmVuY2UgdG8gdGhlIERPTSBzZWxlY3RvclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoYXQgcmVwcmVzZW50cyB0aGUgZWxlbW5lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpbiB0aGUgZG9tIHRoYXQgdGhpcyBjb250ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW5oYWJpdHNcblxuICAgIHRoaXMub25Nb3VudCh0aGlzLCBzZWxlY3Rvcik7IC8vIE1vdW50IHRoZSBjb250ZXh0IHRvIGl0c2VsZlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIChpdCBpcyBpdHMgb3duIHBhcmVudClcbiAgICBcbiAgICB0aGlzLl91cGRhdGVyICAgICAgICAgICAgICAgICAgLy8gbWVzc2FnZSBhIHJlcXVlc3QgZm9yIHRoZSBkb21cbiAgICAgICAgLm1lc3NhZ2UoJ05FRURfU0laRV9GT1InKSAgLy8gc2l6ZSBvZiB0aGUgY29udGV4dCBzbyB0aGF0XG4gICAgICAgIC5tZXNzYWdlKHNlbGVjdG9yKTsgICAgICAgIC8vIHRoZSBzY2VuZSBncmFwaCBoYXMgYSB0b3RhbCBzaXplXG5cbiAgICB0aGlzLnNob3coKTsgLy8gdGhlIGNvbnRleHQgYmVnaW5zIHNob3duIChpdCdzIGFscmVhZHkgcHJlc2VudCBpbiB0aGUgZG9tKVxuXG59XG5cbi8vIFNjZW5lIGluaGVyaXRzIGZyb20gbm9kZVxuU2NlbmUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShOb2RlLnByb3RvdHlwZSk7XG5TY2VuZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY2VuZTtcblxuLyoqXG4gKiBTY2VuZSBnZXRVcGRhdGVyIGZ1bmN0aW9uIHJldHVybnMgdGhlIHBhc3NlZCBpbiB1cGRhdGVyXG4gKlxuICogQHJldHVybiB7RmFtb3VzfSB0aGUgdXBkYXRlciBmb3IgdGhpcyBTY2VuZVxuICovXG5TY2VuZS5wcm90b3R5cGUuZ2V0VXBkYXRlciA9IGZ1bmN0aW9uIGdldFVwZGF0ZXIgKCkge1xuICAgIHJldHVybiB0aGlzLl91cGRhdGVyO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBzZWxlY3RvciB0aGF0IHRoZSBjb250ZXh0IHdhcyBpbnN0YW50aWF0ZWQgd2l0aFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gZG9tIHNlbGVjdG9yXG4gKi9cblNjZW5lLnByb3RvdHlwZS5nZXRTZWxlY3RvciA9IGZ1bmN0aW9uIGdldFNlbGVjdG9yICgpIHtcbiAgICByZXR1cm4gdGhpcy5fc2VsZWN0b3I7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGRpc3BhdGNoZXIgb2YgdGhlIGNvbnRleHQuIFVzZWQgdG8gc2VuZCBldmVudHNcbiAqIHRvIHRoZSBub2RlcyBpbiB0aGUgc2NlbmUgZ3JhcGguXG4gKlxuICogQHJldHVybiB7RGlzcGF0Y2h9IHRoZSBTY2VuZSdzIERpc3BhdGNoXG4gKi9cblNjZW5lLnByb3RvdHlwZS5nZXREaXNwYXRjaCA9IGZ1bmN0aW9uIGdldERpc3BhdGNoICgpIHtcbiAgICByZXR1cm4gdGhpcy5fZGlzcGF0Y2g7XG59O1xuXG4vKipcbiAqIFJlY2VpdmVzIGFuIGV2ZW50LiBJZiB0aGUgZXZlbnQgaXMgJ0NPTlRFWFRfUkVTSVpFJyBpdCBzZXRzIHRoZSBzaXplIG9mIHRoZSBzY2VuZVxuICogZ3JhcGggdG8gdGhlIHBheWxvYWQsIHdoaWNoIG11c3QgYmUgYW4gYXJyYXkgb2YgbnVtYmVycyBvZiBhdCBsZWFzdFxuICogbGVuZ3RoIHRocmVlIHJlcHJlc2VudGluZyB0aGUgcGl4ZWwgc2l6ZSBpbiAzIGRpbWVuc2lvbnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IHRoZSBuYW1lIG9mIHRoZSBldmVudCBiZWluZyByZWNlaXZlZFxuICogQHBhcmFtIHsqfSBwYXlsb2FkIHRoZSBvYmplY3QgYmVpbmcgc2VudFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cblNjZW5lLnByb3RvdHlwZS5vblJlY2VpdmUgPSBmdW5jdGlvbiBvblJlY2VpdmUgKGV2ZW50LCBwYXlsb2FkKSB7XG4gICAgLy8gVE9ETzogSW4gdGhlIGZ1dHVyZSB0aGUgZG9tIGVsZW1lbnQgdGhhdCB0aGUgY29udGV4dCBpcyBhdHRhY2hlZCB0b1xuICAgIC8vIHNob3VsZCBoYXZlIGEgcmVwcmVzZW50YXRpb24gYXMgYSBjb21wb25lbnQuIEl0IHdvdWxkIGJlIHJlbmRlciBzaXplZFxuICAgIC8vIGFuZCB0aGUgY29udGV4dCB3b3VsZCByZWNlaXZlIGl0cyBzaXplIHRoZSBzYW1lIHdheSB0aGF0IGFueSByZW5kZXIgc2l6ZVxuICAgIC8vIGNvbXBvbmVudCByZWNlaXZlcyBpdHMgc2l6ZS5cbiAgICBpZiAoZXZlbnQgPT09ICdDT05URVhUX1JFU0laRScpIHtcbiAgICAgICAgXG4gICAgICAgIGlmIChwYXlsb2FkLmxlbmd0aCA8IDIpIFxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgICAgICAnQ09OVEVYVF9SRVNJWkVcXCdzIHBheWxvYWQgbmVlZHMgdG8gYmUgYXQgbGVhc3QgYSBwYWlyJyArXG4gICAgICAgICAgICAgICAgICAgICcgb2YgcGl4ZWwgc2l6ZXMnXG4gICAgICAgICAgICApO1xuXG4gICAgICAgIHRoaXMuc2V0U2l6ZU1vZGUoU2l6ZS5BQlNPTFVURSwgU2l6ZS5BQlNPTFVURSwgU2l6ZS5BQlNPTFVURSk7XG4gICAgICAgIHRoaXMuc2V0QWJzb2x1dGVTaXplKHBheWxvYWRbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBheWxvYWRbMV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBheWxvYWRbMl0gPyBwYXlsb2FkWzJdIDogMCk7XG5cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNjZW5lO1xuXG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICogXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICogXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKiBcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqIFxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoZSBTaXplIGNsYXNzIGlzIHJlc3BvbnNpYmxlIGZvciBwcm9jZXNzaW5nIFNpemUgZnJvbSBhIG5vZGVcbiAqIEBjb25zdHJ1Y3RvciBTaXplXG4gKi9cbmZ1bmN0aW9uIFNpemUgKCkge1xuICAgIHRoaXMuX3NpemUgPSBuZXcgRmxvYXQzMkFycmF5KDMpO1xufVxuXG4vLyBhbiBlbnVtZXJhdGlvbiBvZiB0aGUgZGlmZmVyZW50IHR5cGVzIG9mIHNpemUgbW9kZXNcblNpemUuUkVMQVRJVkUgPSAwO1xuU2l6ZS5BQlNPTFVURSA9IDE7XG5TaXplLlJFTkRFUiA9IDI7XG5TaXplLkRFRkFVTFQgPSBTaXplLlJFTEFUSVZFO1xuXG4vKipcbiAqIGZyb21TcGVjV2l0aFBhcmVudCB0YWtlcyB0aGUgcGFyZW50IG5vZGUncyBzaXplLCB0aGUgdGFyZ2V0IG5vZGVzIHNwZWMsXG4gKiBhbmQgYSB0YXJnZXQgYXJyYXkgdG8gd3JpdGUgdG8uIFVzaW5nIHRoZSBub2RlJ3Mgc2l6ZSBtb2RlIGl0IGNhbGN1bGF0ZXMgXG4gKiBhIGZpbmFsIHNpemUgZm9yIHRoZSBub2RlIGZyb20gdGhlIG5vZGUncyBzcGVjLiBSZXR1cm5zIHdoZXRoZXIgb3Igbm90XG4gKiB0aGUgZmluYWwgc2l6ZSBoYXMgY2hhbmdlZCBmcm9tIGl0cyBsYXN0IHZhbHVlLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHBhcmVudFNpemUgcGFyZW50IG5vZGUncyBjYWxjdWxhdGVkIHNpemVcbiAqIEBwYXJhbSB7Tm9kZS5TcGVjfSBub2RlIHRoZSB0YXJnZXQgbm9kZSdzIHNwZWNcbiAqIEBwYXJhbSB7QXJyYXl9IHRhcmdldCBhbiBhcnJheSB0byB3cml0ZSB0aGUgcmVzdWx0IHRvXG4gKlxuICogQHJldHVybiB7Qm9vbGVhbn0gdHJ1ZSBpZiB0aGUgc2l6ZSBvZiB0aGUgbm9kZSBoYXMgY2hhbmdlZC5cbiAqL1xuU2l6ZS5wcm90b3R5cGUuZnJvbVNwZWNXaXRoUGFyZW50ID0gZnVuY3Rpb24gZnJvbVNwZWNXaXRoUGFyZW50IChwYXJlbnRTaXplLCBub2RlLCB0YXJnZXQpIHtcbiAgICB2YXIgc3BlYyA9IG5vZGUuZ2V0VmFsdWUoKS5zcGVjO1xuICAgIHZhciBjb21wb25lbnRzID0gbm9kZS5nZXRDb21wb25lbnRzKCk7XG4gICAgdmFyIG1vZGUgPSBzcGVjLnNpemUuc2l6ZU1vZGU7XG4gICAgdmFyIHByZXY7XG4gICAgdmFyIGNoYW5nZWQgPSBmYWxzZTtcbiAgICB2YXIgbGVuID0gY29tcG9uZW50cy5sZW5ndGg7XG4gICAgdmFyIGo7XG4gICAgZm9yICh2YXIgaSA9IDAgOyBpIDwgMyA7IGkrKykge1xuICAgICAgICBzd2l0Y2ggKG1vZGVbaV0pIHtcbiAgICAgICAgICAgIGNhc2UgU2l6ZS5SRUxBVElWRTpcbiAgICAgICAgICAgICAgICBwcmV2ID0gdGFyZ2V0W2ldO1xuICAgICAgICAgICAgICAgIHRhcmdldFtpXSA9IHBhcmVudFNpemVbaV0gKiBzcGVjLnNpemUucHJvcG9ydGlvbmFsW2ldICsgc3BlYy5zaXplLmRpZmZlcmVudGlhbFtpXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU2l6ZS5BQlNPTFVURTpcbiAgICAgICAgICAgICAgICBwcmV2ID0gdGFyZ2V0W2ldO1xuICAgICAgICAgICAgICAgIHRhcmdldFtpXSA9IHNwZWMuc2l6ZS5hYnNvbHV0ZVtpXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU2l6ZS5SRU5ERVI6XG4gICAgICAgICAgICAgICAgdmFyIGNhbmRpZGF0ZTtcbiAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgbGVuIDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnRzW2pdLmdldFJlbmRlclNpemUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZSA9IGNvbXBvbmVudHNbal0uZ2V0UmVuZGVyU2l6ZSgpW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJldiA9IHRhcmdldFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFtpXSA9IHRhcmdldFtpXSA8IGNhbmRpZGF0ZSB8fCB0YXJnZXRbaV0gPT09IDAgPyBjYW5kaWRhdGUgOiB0YXJnZXRbaV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2hhbmdlZCA9IGNoYW5nZWQgfHwgcHJldiAhPT0gdGFyZ2V0W2ldO1xuICAgIH1cbiAgICByZXR1cm4gY2hhbmdlZDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2l6ZTtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKiBcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKiBcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqIFxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICogXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVGhlIHRyYW5zZm9ybSBjbGFzcyBpcyByZXNwb25zaWJsZSBmb3IgY2FsY3VsYXRpbmcgdGhlIHRyYW5zZm9ybSBvZiBhIHBhcnRpY3VsYXJcbiAqIG5vZGUgZnJvbSB0aGUgZGF0YSBvbiB0aGUgbm9kZSBhbmQgaXRzIHBhcmVudFxuICpcbiAqIEBjb25zdHJ1Y3RvciBUcmFuc2Zvcm1cbiAqL1xuZnVuY3Rpb24gVHJhbnNmb3JtICgpIHtcbiAgICB0aGlzLl9tYXRyaXggPSBuZXcgRmxvYXQzMkFycmF5KDE2KTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBsYXN0IGNhbGN1bGF0ZWQgdHJhbnNmb3JtXG4gKlxuICogQHJldHVybiB7QXJyYXl9IGEgdHJhbnNmb3JtXG4gKi9cblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gZ2V0ICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbWF0cml4O1xufTtcblxuLyoqXG4gKiBVc2VzIHRoZSBwYXJlbnQgdHJhbnNmb3JtLCB0aGUgbm9kZSdzIHNwZWMsIHRoZSBub2RlJ3Mgc2l6ZSwgYW5kIHRoZSBwYXJlbnQncyBzaXplXG4gKiB0byBjYWxjdWxhdGUgYSBmaW5hbCB0cmFuc2Zvcm0gZm9yIHRoZSBub2RlLiBSZXR1cm5zIHRydWUgaWYgdGhlIHRyYW5zZm9ybSBoYXMgY2hhbmdlZC5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBwYXJlbnRNYXRyaXggdGhlIHBhcmVudCBtYXRyaXhcbiAqIEBwYXJhbSB7Tm9kZS5TcGVjfSBzcGVjIHRoZSB0YXJnZXQgbm9kZSdzIHNwZWNcbiAqIEBwYXJhbSB7QXJyYXl9IG15U2l6ZSB0aGUgc2l6ZSBvZiB0aGUgbm9kZVxuICogQHBhcmFtIHtBcnJheX0gcGFyZW50U2l6ZSB0aGUgc2l6ZSBvZiB0aGUgcGFyZW50XG4gKiBAcGFyYW0ge0FycmF5fSB0YXJnZXQgdGhlIHRhcmdldCBhcnJheSB0byB3cml0ZSB0aGUgcmVzdWx0aW5nIHRyYW5zZm9ybSB0b1xuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHdoZXRoZXIgb3Igbm90IHRoZSB0cmFuc2Zvcm0gY2hhbmdlZFxuICovXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmZyb21TcGVjV2l0aFBhcmVudCA9IGZ1bmN0aW9uIGZyb21TcGVjV2l0aFBhcmVudCAocGFyZW50TWF0cml4LCBzcGVjLCBteVNpemUsIHBhcmVudFNpemUsIHRhcmdldCkge1xuICAgIHRhcmdldCA9IHRhcmdldCA/IHRhcmdldCA6IHRoaXMuX21hdHJpeDtcblxuICAgIC8vIGxvY2FsIGNhY2hlIG9mIGV2ZXJ5dGhpbmdcbiAgICB2YXIgdDAwICAgICAgICAgPSB0YXJnZXRbMF07XG4gICAgdmFyIHQwMSAgICAgICAgID0gdGFyZ2V0WzFdO1xuICAgIHZhciB0MDIgICAgICAgICA9IHRhcmdldFsyXTtcbiAgICB2YXIgdDEwICAgICAgICAgPSB0YXJnZXRbNF07XG4gICAgdmFyIHQxMSAgICAgICAgID0gdGFyZ2V0WzVdO1xuICAgIHZhciB0MTIgICAgICAgICA9IHRhcmdldFs2XTtcbiAgICB2YXIgdDIwICAgICAgICAgPSB0YXJnZXRbOF07XG4gICAgdmFyIHQyMSAgICAgICAgID0gdGFyZ2V0WzldO1xuICAgIHZhciB0MjIgICAgICAgICA9IHRhcmdldFsxMF07XG4gICAgdmFyIHQzMCAgICAgICAgID0gdGFyZ2V0WzEyXTtcbiAgICB2YXIgdDMxICAgICAgICAgPSB0YXJnZXRbMTNdO1xuICAgIHZhciB0MzIgICAgICAgICA9IHRhcmdldFsxNF07XG4gICAgdmFyIHAwMCAgICAgICAgID0gcGFyZW50TWF0cml4WzBdO1xuICAgIHZhciBwMDEgICAgICAgICA9IHBhcmVudE1hdHJpeFsxXTtcbiAgICB2YXIgcDAyICAgICAgICAgPSBwYXJlbnRNYXRyaXhbMl07XG4gICAgdmFyIHAxMCAgICAgICAgID0gcGFyZW50TWF0cml4WzRdO1xuICAgIHZhciBwMTEgICAgICAgICA9IHBhcmVudE1hdHJpeFs1XTtcbiAgICB2YXIgcDEyICAgICAgICAgPSBwYXJlbnRNYXRyaXhbNl07XG4gICAgdmFyIHAyMCAgICAgICAgID0gcGFyZW50TWF0cml4WzhdO1xuICAgIHZhciBwMjEgICAgICAgICA9IHBhcmVudE1hdHJpeFs5XTtcbiAgICB2YXIgcDIyICAgICAgICAgPSBwYXJlbnRNYXRyaXhbMTBdO1xuICAgIHZhciBwMzAgICAgICAgICA9IHBhcmVudE1hdHJpeFsxMl07XG4gICAgdmFyIHAzMSAgICAgICAgID0gcGFyZW50TWF0cml4WzEzXTtcbiAgICB2YXIgcDMyICAgICAgICAgPSBwYXJlbnRNYXRyaXhbMTRdO1xuICAgIHZhciBwb3NYICAgICAgICA9IHNwZWMudmVjdG9ycy5wb3NpdGlvblswXTtcbiAgICB2YXIgcG9zWSAgICAgICAgPSBzcGVjLnZlY3RvcnMucG9zaXRpb25bMV07XG4gICAgdmFyIHBvc1ogICAgICAgID0gc3BlYy52ZWN0b3JzLnBvc2l0aW9uWzJdO1xuICAgIHZhciByb3RYICAgICAgICA9IHNwZWMudmVjdG9ycy5yb3RhdGlvblswXTtcbiAgICB2YXIgcm90WSAgICAgICAgPSBzcGVjLnZlY3RvcnMucm90YXRpb25bMV07XG4gICAgdmFyIHJvdFogICAgICAgID0gc3BlYy52ZWN0b3JzLnJvdGF0aW9uWzJdO1xuICAgIHZhciByb3RXICAgICAgICA9IHNwZWMudmVjdG9ycy5yb3RhdGlvblszXTtcbiAgICB2YXIgc2NhbGVYICAgICAgPSBzcGVjLnZlY3RvcnMuc2NhbGVbMF07XG4gICAgdmFyIHNjYWxlWSAgICAgID0gc3BlYy52ZWN0b3JzLnNjYWxlWzFdO1xuICAgIHZhciBzY2FsZVogICAgICA9IHNwZWMudmVjdG9ycy5zY2FsZVsyXTtcbiAgICB2YXIgYWxpZ25YICAgICAgPSBzcGVjLm9mZnNldHMuYWxpZ25bMF0gKiBwYXJlbnRTaXplWzBdO1xuICAgIHZhciBhbGlnblkgICAgICA9IHNwZWMub2Zmc2V0cy5hbGlnblsxXSAqIHBhcmVudFNpemVbMV07XG4gICAgdmFyIGFsaWduWiAgICAgID0gc3BlYy5vZmZzZXRzLmFsaWduWzJdICogcGFyZW50U2l6ZVsyXTtcbiAgICB2YXIgbW91bnRQb2ludFggPSBzcGVjLm9mZnNldHMubW91bnRQb2ludFswXSAqIG15U2l6ZVswXTtcbiAgICB2YXIgbW91bnRQb2ludFkgPSBzcGVjLm9mZnNldHMubW91bnRQb2ludFsxXSAqIG15U2l6ZVsxXTtcbiAgICB2YXIgbW91bnRQb2ludFogPSBzcGVjLm9mZnNldHMubW91bnRQb2ludFsyXSAqIG15U2l6ZVsyXTtcbiAgICB2YXIgb3JpZ2luWCAgICAgPSBzcGVjLm9mZnNldHMub3JpZ2luWzBdICogbXlTaXplWzBdO1xuICAgIHZhciBvcmlnaW5ZICAgICA9IHNwZWMub2Zmc2V0cy5vcmlnaW5bMV0gKiBteVNpemVbMV07XG4gICAgdmFyIG9yaWdpblogICAgID0gc3BlYy5vZmZzZXRzLm9yaWdpblsyXSAqIG15U2l6ZVsyXTtcblxuICAgIHZhciB3eCA9IHJvdFcgKiByb3RYO1xuICAgIHZhciB3eSA9IHJvdFcgKiByb3RZO1xuICAgIHZhciB3eiA9IHJvdFcgKiByb3RaO1xuICAgIHZhciB4eCA9IHJvdFggKiByb3RYO1xuICAgIHZhciB5eSA9IHJvdFkgKiByb3RZO1xuICAgIHZhciB6eiA9IHJvdFogKiByb3RaO1xuICAgIHZhciB4eSA9IHJvdFggKiByb3RZO1xuICAgIHZhciB4eiA9IHJvdFggKiByb3RaO1xuICAgIHZhciB5eiA9IHJvdFkgKiByb3RaO1xuXG4gICAgdmFyIHJzMCA9ICgxIC0gMiAqICh5eSArIHp6KSkgKiBzY2FsZVg7XG4gICAgdmFyIHJzMSA9ICgyICogKHh5ICsgd3opKSAqIHNjYWxlWDtcbiAgICB2YXIgcnMyID0gKDIgKiAoeHogLSB3eSkpICogc2NhbGVYO1xuICAgIHZhciByczMgPSAoMiAqICh4eSAtIHd6KSkgKiBzY2FsZVk7XG4gICAgdmFyIHJzNCA9ICgxIC0gMiAqICh4eCArIHp6KSkgKiBzY2FsZVk7XG4gICAgdmFyIHJzNSA9ICgyICogKHl6ICsgd3gpKSAqIHNjYWxlWTtcbiAgICB2YXIgcnM2ID0gKDIgKiAoeHogKyB3eSkpICogc2NhbGVaO1xuICAgIHZhciByczcgPSAoMiAqICh5eiAtIHd4KSkgKiBzY2FsZVo7XG4gICAgdmFyIHJzOCA9ICgxIC0gMiAqICh4eCArIHl5KSkgKiBzY2FsZVo7XG5cbiAgICB2YXIgdHggPSBhbGlnblggKyBwb3NYIC0gbW91bnRQb2ludFggKyBvcmlnaW5YIC0gKHJzMCAqIG9yaWdpblggKyByczMgKiBvcmlnaW5ZICsgcnM2ICogb3JpZ2luWik7XG4gICAgdmFyIHR5ID0gYWxpZ25ZICsgcG9zWSAtIG1vdW50UG9pbnRZICsgb3JpZ2luWSAtIChyczEgKiBvcmlnaW5YICsgcnM0ICogb3JpZ2luWSArIHJzNyAqIG9yaWdpblopO1xuICAgIHZhciB0eiA9IGFsaWduWiArIHBvc1ogLSBtb3VudFBvaW50WiArIG9yaWdpblogLSAocnMyICogb3JpZ2luWCArIHJzNSAqIG9yaWdpblkgKyByczggKiBvcmlnaW5aKTtcblxuICAgIHRhcmdldFswXSA9IHAwMCAqIHJzMCArIHAxMCAqIHJzMSArIHAyMCAqIHJzMjtcbiAgICB0YXJnZXRbMV0gPSBwMDEgKiByczAgKyBwMTEgKiByczEgKyBwMjEgKiByczI7XG4gICAgdGFyZ2V0WzJdID0gcDAyICogcnMwICsgcDEyICogcnMxICsgcDIyICogcnMyO1xuICAgIHRhcmdldFszXSA9IDA7XG4gICAgdGFyZ2V0WzRdID0gcDAwICogcnMzICsgcDEwICogcnM0ICsgcDIwICogcnM1O1xuICAgIHRhcmdldFs1XSA9IHAwMSAqIHJzMyArIHAxMSAqIHJzNCArIHAyMSAqIHJzNTtcbiAgICB0YXJnZXRbNl0gPSBwMDIgKiByczMgKyBwMTIgKiByczQgKyBwMjIgKiByczU7XG4gICAgdGFyZ2V0WzddID0gMDtcbiAgICB0YXJnZXRbOF0gPSBwMDAgKiByczYgKyBwMTAgKiByczcgKyBwMjAgKiByczg7XG4gICAgdGFyZ2V0WzldID0gcDAxICogcnM2ICsgcDExICogcnM3ICsgcDIxICogcnM4O1xuICAgIHRhcmdldFsxMF0gPSBwMDIgKiByczYgKyBwMTIgKiByczcgKyBwMjIgKiByczg7XG4gICAgdGFyZ2V0WzExXSA9IDA7XG4gICAgdGFyZ2V0WzEyXSA9IHAwMCAqIHR4ICsgcDEwICogdHkgKyBwMjAgKiB0eiArIHAzMDtcbiAgICB0YXJnZXRbMTNdID0gcDAxICogdHggKyBwMTEgKiB0eSArIHAyMSAqIHR6ICsgcDMxO1xuICAgIHRhcmdldFsxNF0gPSBwMDIgKiB0eCArIHAxMiAqIHR5ICsgcDIyICogdHogKyBwMzI7XG4gICAgdGFyZ2V0WzE1XSA9IDE7XG5cbiAgICByZXR1cm4gdDAwICE9PSB0YXJnZXRbMF0gfHxcbiAgICAgICAgdDAxICE9PSB0YXJnZXRbMV0gfHxcbiAgICAgICAgdDAyICE9PSB0YXJnZXRbMl0gfHxcbiAgICAgICAgdDEwICE9PSB0YXJnZXRbNF0gfHxcbiAgICAgICAgdDExICE9PSB0YXJnZXRbNV0gfHxcbiAgICAgICAgdDEyICE9PSB0YXJnZXRbNl0gfHxcbiAgICAgICAgdDIwICE9PSB0YXJnZXRbOF0gfHxcbiAgICAgICAgdDIxICE9PSB0YXJnZXRbOV0gfHxcbiAgICAgICAgdDIyICE9PSB0YXJnZXRbMTBdIHx8XG4gICAgICAgIHQzMCAhPT0gdGFyZ2V0WzEyXSB8fFxuICAgICAgICB0MzEgIT09IHRhcmdldFsxM10gfHxcbiAgICAgICAgdDMyICE9PSB0YXJnZXRbMTRdO1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zZm9ybTtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIENhbGxiYWNrU3RvcmUgPSByZXF1aXJlKCcuLi91dGlsaXRpZXMvQ2FsbGJhY2tTdG9yZScpO1xuXG52YXIgUkVOREVSX1NJWkUgPSAyO1xuXG4vKipcbiAqIEEgRE9NRWxlbWVudCBpcyBhIGNvbXBvbmVudCB0aGF0IGNhbiBiZSBhZGRlZCB0byBhIE5vZGUgd2l0aCB0aGVcbiAqIHB1cnBvc2Ugb2Ygc2VuZGluZyBkcmF3IGNvbW1hbmRzIHRvIHRoZSByZW5kZXJlci4gUmVuZGVyYWJsZXMgc2VuZCBkcmF3IGNvbW1hbmRzXG4gKiB0byB0aHJvdWdoIHRoZWlyIE5vZGVzIHRvIHRoZSBDb21wb3NpdG9yIHdoZXJlIHRoZXkgYXJlIGFjdGVkIHVwb24uXG4gKlxuICogQGNsYXNzIERPTUVsZW1lbnRcbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgICAgICAgICAgICAgICAgICAgVGhlIE5vZGUgdG8gd2hpY2ggdGhlIGBET01FbGVtZW50YFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlcmFibGUgc2hvdWxkIGJlIGF0dGFjaGVkIHRvLlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgICAgICAgICAgICAgIEluaXRpYWwgb3B0aW9ucyB1c2VkIGZvciBpbnN0YW50aWF0aW5nXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIE5vZGUuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucy5wcm9wZXJ0aWVzICAgQ1NTIHByb3BlcnRpZXMgdGhhdCBzaG91bGQgYmUgYWRkZWQgdG9cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgYWN0dWFsIERPTUVsZW1lbnQgb24gdGhlIGluaXRpYWwgZHJhdy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zLmF0dHJpYnV0ZXMgICBFbGVtZW50IGF0dHJpYnV0ZXMgdGhhdCBzaG91bGQgYmUgYWRkZWQgdG9cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgYWN0dWFsIERPTUVsZW1lbnQuXG4gKiBAcGFyYW0ge1N0cmluZ30gb3B0aW9ucy5pZCAgICAgICAgICAgU3RyaW5nIHRvIGJlIGFwcGxpZWQgYXMgJ2lkJyBvZiB0aGUgYWN0dWFsXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRE9NRWxlbWVudC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBvcHRpb25zLmNvbnRlbnQgICAgICBTdHJpbmcgdG8gYmUgYXBwbGllZCBhcyB0aGUgY29udGVudCBvZiB0aGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3R1YWwgRE9NRWxlbWVudC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5jdXRvdXQgICAgICBTcGVjaWZpZXMgdGhlIHByZXNlbmNlIG9mIGEgJ2N1dG91dCcgaW4gdGhlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgV2ViR0wgY2FudmFzIG92ZXIgdGhpcyBlbGVtZW50IHdoaWNoIGFsbG93c1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciBET00gYW5kIFdlYkdMIGxheWVyaW5nLiAgT24gYnkgZGVmYXVsdC5cbiAqL1xuZnVuY3Rpb24gRE9NRWxlbWVudChub2RlLCBvcHRpb25zKSB7XG4gICAgaWYgKCFub2RlKSB0aHJvdyBuZXcgRXJyb3IoJ0RPTUVsZW1lbnQgbXVzdCBiZSBpbnN0YW50aWF0ZWQgb24gYSBub2RlJyk7XG5cbiAgICB0aGlzLl9ub2RlID0gbm9kZTtcbiAgICB0aGlzLl9wYXJlbnQgPSBudWxsO1xuICAgIHRoaXMuX2NoaWxkcmVuID0gW107XG5cbiAgICB0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlID0gZmFsc2U7XG4gICAgdGhpcy5fcmVuZGVyU2l6ZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9yZXF1ZXN0UmVuZGVyU2l6ZSA9IGZhbHNlO1xuXG4gICAgdGhpcy5fY2hhbmdlUXVldWUgPSBbXTtcblxuICAgIHRoaXMuX1VJRXZlbnRzID0gbm9kZS5nZXRVSUV2ZW50cygpLnNsaWNlKDApO1xuICAgIHRoaXMuX2NsYXNzZXMgPSBbJ2ZhbW91cy1kb20tZWxlbWVudCddO1xuICAgIHRoaXMuX3JlcXVlc3RpbmdFdmVudExpc3RlbmVycyA9IFtdO1xuICAgIHRoaXMuX3N0eWxlcyA9IHt9O1xuXG4gICAgdGhpcy5zZXRQcm9wZXJ0eSgnZGlzcGxheScsIG5vZGUuaXNTaG93bigpID8gJ25vbmUnIDogJ2Jsb2NrJyk7XG4gICAgdGhpcy5vbk9wYWNpdHlDaGFuZ2Uobm9kZS5nZXRPcGFjaXR5KCkpO1xuXG4gICAgdGhpcy5fYXR0cmlidXRlcyA9IHt9O1xuICAgIHRoaXMuX2NvbnRlbnQgPSAnJztcblxuICAgIHRoaXMuX3RhZ05hbWUgPSBvcHRpb25zICYmIG9wdGlvbnMudGFnTmFtZSA/IG9wdGlvbnMudGFnTmFtZSA6ICdkaXYnO1xuICAgIHRoaXMuX2lkID0gbm9kZSA/IG5vZGUuYWRkQ29tcG9uZW50KHRoaXMpIDogbnVsbDtcblxuICAgIHRoaXMuX3JlbmRlclNpemUgPSBbMCwgMCwgMF07XG5cbiAgICB0aGlzLl9jYWxsYmFja3MgPSBuZXcgQ2FsbGJhY2tTdG9yZSgpO1xuXG5cbiAgICBpZiAoIW9wdGlvbnMpIHJldHVybjtcblxuICAgIHZhciBpO1xuICAgIHZhciBrZXk7XG5cbiAgICBpZiAob3B0aW9ucy5jbGFzc2VzKVxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgb3B0aW9ucy5jbGFzc2VzLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgdGhpcy5hZGRDbGFzcyhvcHRpb25zLmNsYXNzZXNbaV0pO1xuXG4gICAgaWYgKG9wdGlvbnMuYXR0cmlidXRlcylcbiAgICAgICAgZm9yIChrZXkgaW4gb3B0aW9ucy5hdHRyaWJ1dGVzKVxuICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGUoa2V5LCBvcHRpb25zLmF0dHJpYnV0ZXNba2V5XSk7XG5cbiAgICBpZiAob3B0aW9ucy5wcm9wZXJ0aWVzKVxuICAgICAgICBmb3IgKGtleSBpbiBvcHRpb25zLnByb3BlcnRpZXMpXG4gICAgICAgICAgICB0aGlzLnNldFByb3BlcnR5KGtleSwgb3B0aW9ucy5wcm9wZXJ0aWVzW2tleV0pO1xuXG4gICAgaWYgKG9wdGlvbnMuaWQpIHRoaXMuc2V0SWQob3B0aW9ucy5pZCk7XG4gICAgaWYgKG9wdGlvbnMuY29udGVudCkgdGhpcy5zZXRDb250ZW50KG9wdGlvbnMuY29udGVudCk7XG4gICAgaWYgKG9wdGlvbnMuY3V0b3V0ID09PSBmYWxzZSkgdGhpcy5zZXRDdXRvdXRTdGF0ZShvcHRpb25zLmN1dG91dCk7XG59XG5cbi8qKlxuICogU2VyaWFsaXplcyB0aGUgc3RhdGUgb2YgdGhlIERPTUVsZW1lbnQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gc2VyaWFsaXplZCBpbnRlcmFsIHN0YXRlXG4gKi9cbkRPTUVsZW1lbnQucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24gZ2V0VmFsdWUoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY2xhc3NlczogdGhpcy5fY2xhc3NlcyxcbiAgICAgICAgc3R5bGVzOiB0aGlzLl9zdHlsZXMsXG4gICAgICAgIGF0dHJpYnV0ZXM6IHRoaXMuX2F0dHJpYnV0ZXMsXG4gICAgICAgIGNvbnRlbnQ6IHRoaXMuX2NvbnRlbnQsXG4gICAgICAgIGlkOiB0aGlzLl9hdHRyaWJ1dGVzLmlkLFxuICAgICAgICB0YWdOYW1lOiB0aGlzLl90YWdOYW1lXG4gICAgfTtcbn07XG5cbi8qKlxuICogTWV0aG9kIHRvIGJlIGludm9rZWQgYnkgdGhlIG5vZGUgYXMgc29vbiBhcyBhbiB1cGRhdGUgb2NjdXJzLiBUaGlzIGFsbG93c1xuICogdGhlIERPTUVsZW1lbnQgcmVuZGVyYWJsZSB0byBkeW5hbWljYWxseSByZWFjdCB0byBzdGF0ZSBjaGFuZ2VzIG9uIHRoZSBOb2RlLlxuICpcbiAqIFRoaXMgZmx1c2hlcyB0aGUgaW50ZXJuYWwgZHJhdyBjb21tYW5kIHF1ZXVlIGJ5IHNlbmRpbmcgaW5kaXZpZHVhbCBjb21tYW5kc1xuICogdG8gdGhlIG5vZGUgdXNpbmcgYHNlbmREcmF3Q29tbWFuZGAuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTUVsZW1lbnQucHJvdG90eXBlLm9uVXBkYXRlID0gZnVuY3Rpb24gb25VcGRhdGUoKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlO1xuICAgIHZhciBxdWV1ZSA9IHRoaXMuX2NoYW5nZVF1ZXVlO1xuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG5cbiAgICBpZiAobGVuICYmIG5vZGUpIHtcbiAgICAgICAgbm9kZS5zZW5kRHJhd0NvbW1hbmQoJ1dJVEgnKTtcbiAgICAgICAgbm9kZS5zZW5kRHJhd0NvbW1hbmQobm9kZS5nZXRMb2NhdGlvbigpKTtcblxuICAgICAgICB3aGlsZSAobGVuLS0pIG5vZGUuc2VuZERyYXdDb21tYW5kKHF1ZXVlLnNoaWZ0KCkpO1xuICAgICAgICBpZiAodGhpcy5fcmVxdWVzdFJlbmRlclNpemUpIHtcbiAgICAgICAgICAgIG5vZGUuc2VuZERyYXdDb21tYW5kKCdET01fUkVOREVSX1NJWkUnKTtcbiAgICAgICAgICAgIG5vZGUuc2VuZERyYXdDb21tYW5kKG5vZGUuZ2V0TG9jYXRpb24oKSk7XG4gICAgICAgICAgICB0aGlzLl9yZXF1ZXN0UmVuZGVyU2l6ZSA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICB0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlID0gZmFsc2U7XG59O1xuXG4vKipcbiAqIFByaXZhdGUgbWV0aG9kIHdoaWNoIHNldHMgdGhlIHBhcmVudCBvZiB0aGUgZWxlbWVudCBpbiB0aGUgRE9NXG4gKiBoaWVyYXJjaHkuXG4gKlxuICogQG1ldGhvZCBfc2V0UGFyZW50XG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIG9mIHRoZSBwYXJlbnRcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01FbGVtZW50LnByb3RvdHlwZS5fc2V0UGFyZW50ID0gZnVuY3Rpb24gX3NldFBhcmVudChwYXRoKSB7XG4gICAgaWYgKHRoaXMuX25vZGUpIHtcbiAgICAgICAgdmFyIGxvY2F0aW9uID0gdGhpcy5fbm9kZS5nZXRMb2NhdGlvbigpO1xuICAgICAgICBpZiAobG9jYXRpb24gPT09IHBhdGggfHwgbG9jYXRpb24uaW5kZXhPZihwYXRoKSA9PT0gLTEpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBnaXZlbiBwYXRoIGlzblxcJ3QgYW4gYW5jZXN0b3InKTtcbiAgICAgICAgdGhpcy5fcGFyZW50ID0gcGF0aDtcbiAgICB9IGVsc2UgdGhyb3cgbmV3IEVycm9yKCdfc2V0UGFyZW50IGNhbGxlZCBvbiBhbiBFbGVtZW50IHRoYXQgaXNuXFwndCBpbiB0aGUgc2NlbmUgZ3JhcGgnKTtcbn07XG5cbi8qKlxuICogUHJpdmF0ZSBtZXRob2Qgd2hpY2ggYWRkcyBhIGNoaWxkIG9mIHRoZSBlbGVtZW50IGluIHRoZSBET01cbiAqIGhpZXJhcmNoeS5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIG9mIHRoZSBjaGlsZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTUVsZW1lbnQucHJvdG90eXBlLl9hZGRDaGlsZCA9IGZ1bmN0aW9uIF9hZGRDaGlsZChwYXRoKSB7XG4gICAgaWYgKHRoaXMuX25vZGUpIHtcbiAgICAgICAgdmFyIGxvY2F0aW9uID0gdGhpcy5fbm9kZS5nZXRMb2NhdGlvbigpO1xuICAgICAgICBpZiAocGF0aCA9PT0gbG9jYXRpb24gfHwgcGF0aC5pbmRleE9mKGxvY2F0aW9uKSA9PT0gLTEpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBnaXZlbiBwYXRoIGlzblxcJ3QgYSBkZXNjZW5kZW50Jyk7XG4gICAgICAgIGlmICh0aGlzLl9jaGlsZHJlbi5pbmRleE9mKHBhdGgpID09PSAtMSkgdGhpcy5fY2hpbGRyZW4ucHVzaChwYXRoKTtcbiAgICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBnaXZlbiBwYXRoIGlzIGFscmVhZHkgYSBjaGlsZCBvZiB0aGlzIGVsZW1lbnQnKTtcbiAgICB9IGVsc2UgdGhyb3cgbmV3IEVycm9yKCdfYWRkQ2hpbGQgY2FsbGVkIG9uIGFuIEVsZW1lbnQgdGhhdCBpc25cXCd0IGluIHRoZSBzY2VuZSBncmFwaCcpO1xufTtcblxuLyoqXG4gKiBQcml2YXRlIG1ldGhvZCB3aGljaCByZXR1cm5zIHRoZSBwYXRoIG9mIHRoZSBwYXJlbnQgb2YgdGhpcyBlbGVtZW50XG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHBhdGggb2YgdGhlIHBhcmVudCBlbGVtZW50XG4gKi9cbkRPTUVsZW1lbnQucHJvdG90eXBlLl9nZXRQYXJlbnQgPSBmdW5jdGlvbiBfZ2V0UGFyZW50KCkge1xuICAgIHJldHVybiB0aGlzLl9wYXJlbnQ7XG59O1xuXG4vKipcbiAqIFByaXZhdGUgbWV0aG9kIHdoaWNoIHJldHVybnMgYW4gYXJyYXkgb2YgcGF0aHMgb2YgdGhlIGNoaWxkcmVuIGVsZW1lbnRzXG4gKiBvZiB0aGlzIGVsZW1lbnRcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBhbiBhcnJheSBvZiB0aGUgcGF0aHMgb2YgdGhlIGNoaWxkIGVsZW1lbnRcbiAqL1xuRE9NRWxlbWVudC5wcm90b3R5cGUuX2dldENoaWxkcmVuID0gZnVuY3Rpb24gX2dldENoaWxkcmVuKCkge1xuICAgIHJldHVybiB0aGlzLl9jaGlsZHJlbjtcbn07XG5cbi8qKlxuICogTWV0aG9kIHRvIGJlIGludm9rZWQgYnkgdGhlIE5vZGUgYXMgc29vbiBhcyB0aGUgbm9kZSAob3IgYW55IG9mIGl0c1xuICogYW5jZXN0b3JzKSBpcyBiZWluZyBtb3VudGVkLlxuICpcbiAqIEBtZXRob2Qgb25Nb3VudFxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAgICAgIFBhcmVudCBub2RlIHRvIHdoaWNoIHRoZSBjb21wb25lbnQgc2hvdWxkIGJlIGFkZGVkLlxuICogQHBhcmFtIHtTdHJpbmd9IGlkICAgICAgUGF0aCBhdCB3aGljaCB0aGUgY29tcG9uZW50IChvciBub2RlKSBpcyBiZWluZ1xuICogICAgICAgICAgICAgICAgICAgICAgICAgIGF0dGFjaGVkLiBUaGUgcGF0aCBpcyBiZWluZyBzZXQgb24gdGhlIGFjdHVhbFxuICogICAgICAgICAgICAgICAgICAgICAgICAgIERPTUVsZW1lbnQgYXMgYSBgZGF0YS1mYS1wYXRoYC1hdHRyaWJ1dGUuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NRWxlbWVudC5wcm90b3R5cGUub25Nb3VudCA9IGZ1bmN0aW9uIG9uTW91bnQobm9kZSwgaWQpIHtcbiAgICB0aGlzLl9ub2RlID0gbm9kZTtcbiAgICB0aGlzLl9pZCA9IGlkO1xuICAgIHRoaXMuX1VJRXZlbnRzID0gbm9kZS5nZXRVSUV2ZW50cygpLnNsaWNlKDApO1xuICAgIHRoaXMuZHJhdygpO1xuICAgIHRoaXMuc2V0QXR0cmlidXRlKCdkYXRhLWZhLXBhdGgnLCBub2RlLmdldExvY2F0aW9uKCkpO1xufTtcblxuLyoqXG4gKiBNZXRob2QgdG8gYmUgaW52b2tlZCBieSB0aGUgTm9kZSBhcyBzb29uIGFzIHRoZSBub2RlIGlzIGJlaW5nIGRpc21vdW50ZWRcbiAqIGVpdGhlciBkaXJlY3RseSBvciBieSBkaXNtb3VudGluZyBvbmUgb2YgaXRzIGFuY2VzdG9ycy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NRWxlbWVudC5wcm90b3R5cGUub25EaXNtb3VudCA9IGZ1bmN0aW9uIG9uRGlzbW91bnQoKSB7XG4gICAgdGhpcy5zZXRQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XG4gICAgdGhpcy5zZXRBdHRyaWJ1dGUoJ2RhdGEtZmEtcGF0aCcsICcnKTtcbiAgICB0aGlzLl9pbml0aWFsaXplZCA9IGZhbHNlO1xufTtcblxuLyoqXG4gKiBNZXRob2QgdG8gYmUgaW52b2tlZCBieSB0aGUgbm9kZSBhcyBzb29uIGFzIHRoZSBET01FbGVtZW50IGlzIGJlaW5nIHNob3duLlxuICogVGhpcyByZXN1bHRzIGludG8gdGhlIERPTUVsZW1lbnQgc2V0dGluZyB0aGUgYGRpc3BsYXlgIHByb3BlcnR5IHRvIGBibG9ja2BcbiAqIGFuZCB0aGVyZWZvcmUgdmlzdWFsbHkgc2hvd2luZyB0aGUgY29ycmVzcG9uZGluZyBET01FbGVtZW50IChhZ2FpbikuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTUVsZW1lbnQucHJvdG90eXBlLm9uU2hvdyA9IGZ1bmN0aW9uIG9uU2hvdygpIHtcbiAgICB0aGlzLnNldFByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG59O1xuXG4vKipcbiAqIE1ldGhvZCB0byBiZSBpbnZva2VkIGJ5IHRoZSBub2RlIGFzIHNvb24gYXMgdGhlIERPTUVsZW1lbnQgaXMgYmVpbmcgaGlkZGVuLlxuICogVGhpcyByZXN1bHRzIGludG8gdGhlIERPTUVsZW1lbnQgc2V0dGluZyB0aGUgYGRpc3BsYXlgIHByb3BlcnR5IHRvIGBub25lYFxuICogYW5kIHRoZXJlZm9yZSB2aXN1YWxseSBoaWRpbmcgdGhlIGNvcnJlc3BvbmRpbmcgRE9NRWxlbWVudCAoYWdhaW4pLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01FbGVtZW50LnByb3RvdHlwZS5vbkhpZGUgPSBmdW5jdGlvbiBvbkhpZGUoKSB7XG4gICAgdGhpcy5zZXRQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XG59O1xuXG4vKipcbiAqIEVuYWJsZXMgb3IgZGlzYWJsZXMgV2ViR0wgJ2N1dG91dCcgZm9yIHRoaXMgZWxlbWVudCwgd2hpY2ggYWZmZWN0c1xuICogaG93IHRoZSBlbGVtZW50IGlzIGxheWVyZWQgd2l0aCBXZWJHTCBvYmplY3RzIGluIHRoZSBzY2VuZS4gIFRoaXMgaXMgZGVzaWduZWRcbiAqIG1haW5seSBhcyBhIHdheSB0byBhY2hlaXZlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gdXNlc0N1dG91dCAgVGhlIHByZXNlbmNlIG9mIGEgV2ViR0wgJ2N1dG91dCcgZm9yIHRoaXMgZWxlbWVudC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01FbGVtZW50LnByb3RvdHlwZS5zZXRDdXRvdXRTdGF0ZSA9IGZ1bmN0aW9uIHNldEN1dG91dFN0YXRlKHVzZXNDdXRvdXQpIHtcbiAgICB0aGlzLl9jaGFuZ2VRdWV1ZS5wdXNoKCdHTF9DVVRPVVRfU1RBVEUnLCB1c2VzQ3V0b3V0KTtcblxuICAgIGlmICh0aGlzLl9pbml0aWFsaXplZCkgdGhpcy5fcmVxdWVzdFVwZGF0ZSgpO1xufTtcblxuLyoqXG4gKiBNZXRob2QgdG8gYmUgaW52b2tlZCBieSB0aGUgbm9kZSBhcyBzb29uIGFzIHRoZSB0cmFuc2Zvcm0gbWF0cml4IGFzc29jaWF0ZWRcbiAqIHdpdGggdGhlIG5vZGUgY2hhbmdlcy4gVGhlIERPTUVsZW1lbnQgd2lsbCByZWFjdCB0byB0cmFuc2Zvcm0gY2hhbmdlcyBieSBzZW5kaW5nXG4gKiBgQ0hBTkdFX1RSQU5TRk9STWAgY29tbWFuZHMgdG8gdGhlIGBET01SZW5kZXJlcmAuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7RmxvYXQzMkFycmF5fSB0cmFuc2Zvcm0gVGhlIGZpbmFsIHRyYW5zZm9ybSBtYXRyaXhcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01FbGVtZW50LnByb3RvdHlwZS5vblRyYW5zZm9ybUNoYW5nZSA9IGZ1bmN0aW9uIG9uVHJhbnNmb3JtQ2hhbmdlICh0cmFuc2Zvcm0pIHtcbiAgICB0aGlzLl9jaGFuZ2VRdWV1ZS5wdXNoKCdDSEFOR0VfVFJBTlNGT1JNJyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRyYW5zZm9ybS5sZW5ndGggOyBpIDwgbGVuIDsgaSsrKVxuICAgICAgICB0aGlzLl9jaGFuZ2VRdWV1ZS5wdXNoKHRyYW5zZm9ybVtpXSk7XG5cbiAgICB0aGlzLm9uVXBkYXRlKCk7XG59O1xuXG4vKipcbiAqIE1ldGhvZCB0byBiZSBpbnZva2VkIGJ5IHRoZSBub2RlIGFzIHNvb24gYXMgaXRzIGNvbXB1dGVkIHNpemUgY2hhbmdlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtGbG9hdDMyQXJyYXl9IHNpemUgU2l6ZSBvZiB0aGUgTm9kZSBpbiBwaXhlbHNcbiAqXG4gKiBAcmV0dXJuIHtET01FbGVtZW50fSB0aGlzXG4gKi9cbkRPTUVsZW1lbnQucHJvdG90eXBlLm9uU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uIG9uU2l6ZUNoYW5nZShzaXplKSB7XG4gICAgdmFyIHNpemVNb2RlID0gdGhpcy5fbm9kZS5nZXRTaXplTW9kZSgpO1xuICAgIHZhciBzaXplZFggPSBzaXplTW9kZVswXSAhPT0gUkVOREVSX1NJWkU7XG4gICAgdmFyIHNpemVkWSA9IHNpemVNb2RlWzFdICE9PSBSRU5ERVJfU0laRTtcbiAgICBpZiAodGhpcy5faW5pdGlhbGl6ZWQpXG4gICAgICAgIHRoaXMuX2NoYW5nZVF1ZXVlLnB1c2goJ0NIQU5HRV9TSVpFJyxcbiAgICAgICAgICAgIHNpemVkWCA/IHNpemVbMF0gOiBzaXplZFgsXG4gICAgICAgICAgICBzaXplZFkgPyBzaXplWzFdIDogc2l6ZWRZKTtcblxuICAgIGlmICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSkgdGhpcy5fcmVxdWVzdFVwZGF0ZSgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBNZXRob2QgdG8gYmUgaW52b2tlZCBieSB0aGUgbm9kZSBhcyBzb29uIGFzIGl0cyBvcGFjaXR5IGNoYW5nZXNcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG9wYWNpdHkgVGhlIG5ldyBvcGFjaXR5LCBhcyBhIHNjYWxhciBmcm9tIDAgdG8gMVxuICpcbiAqIEByZXR1cm4ge0RPTUVsZW1lbnR9IHRoaXNcbiAqL1xuRE9NRWxlbWVudC5wcm90b3R5cGUub25PcGFjaXR5Q2hhbmdlID0gZnVuY3Rpb24gb25PcGFjaXR5Q2hhbmdlKG9wYWNpdHkpIHtcbiAgICByZXR1cm4gdGhpcy5zZXRQcm9wZXJ0eSgnb3BhY2l0eScsIG9wYWNpdHkpO1xufTtcblxuLyoqXG4gKiBNZXRob2QgdG8gYmUgaW52b2tlZCBieSB0aGUgbm9kZSBhcyBzb29uIGFzIGEgbmV3IFVJRXZlbnQgaXMgYmVpbmcgYWRkZWQuXG4gKiBUaGlzIHJlc3VsdHMgaW50byBhbiBgQUREX0VWRU5UX0xJU1RFTkVSYCBjb21tYW5kIGJlaW5nIHNlbmQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFVJRXZlbnQgVUlFdmVudCB0byBiZSBzdWJzY3JpYmVkIHRvIChlLmcuIGBjbGlja2ApXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NRWxlbWVudC5wcm90b3R5cGUub25BZGRVSUV2ZW50ID0gZnVuY3Rpb24gb25BZGRVSUV2ZW50KFVJRXZlbnQpIHtcbiAgICBpZiAodGhpcy5fVUlFdmVudHMuaW5kZXhPZihVSUV2ZW50KSA9PT0gLTEpIHtcbiAgICAgICAgdGhpcy5fc3Vic2NyaWJlKFVJRXZlbnQpO1xuICAgICAgICB0aGlzLl9VSUV2ZW50cy5wdXNoKFVJRXZlbnQpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLl9pbkRyYXcpIHtcbiAgICAgICAgdGhpcy5fc3Vic2NyaWJlKFVJRXZlbnQpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQXBwZW5kcyBhbiBgQUREX0VWRU5UX0xJU1RFTkVSYCBjb21tYW5kIHRvIHRoZSBjb21tYW5kIHF1ZXVlLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFVJRXZlbnQgRXZlbnQgdHlwZSAoZS5nLiBgY2xpY2tgKVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTUVsZW1lbnQucHJvdG90eXBlLl9zdWJzY3JpYmUgPSBmdW5jdGlvbiBfc3Vic2NyaWJlIChVSUV2ZW50KSB7XG4gICAgaWYgKHRoaXMuX2luaXRpYWxpemVkKSB7XG4gICAgICAgIHRoaXMuX2NoYW5nZVF1ZXVlLnB1c2goJ1NVQlNDUklCRScsIFVJRXZlbnQsIHRydWUpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuX3JlcXVlc3RpbmdVcGRhdGUpIHtcbiAgICAgICAgdGhpcy5fcmVxdWVzdFVwZGF0ZSgpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuX3JlcXVlc3RpbmdVcGRhdGUpIHRoaXMuX3JlcXVlc3RVcGRhdGUoKTtcbn07XG5cbi8qKlxuICogTWV0aG9kIHRvIGJlIGludm9rZWQgYnkgdGhlIG5vZGUgYXMgc29vbiBhcyB0aGUgdW5kZXJseWluZyBzaXplIG1vZGVcbiAqIGNoYW5nZXMuIFRoaXMgcmVzdWx0cyBpbnRvIHRoZSBzaXplIGJlaW5nIGZldGNoZWQgZnJvbSB0aGUgbm9kZSBpblxuICogb3JkZXIgdG8gdXBkYXRlIHRoZSBhY3R1YWwsIHJlbmRlcmVkIHNpemUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IHRoZSBzaXppbmcgbW9kZSBpbiB1c2UgZm9yIGRldGVybWluaW5nIHNpemUgaW4gdGhlIHggZGlyZWN0aW9uXG4gKiBAcGFyYW0ge051bWJlcn0geSB0aGUgc2l6aW5nIG1vZGUgaW4gdXNlIGZvciBkZXRlcm1pbmluZyBzaXplIGluIHRoZSB5IGRpcmVjdGlvblxuICogQHBhcmFtIHtOdW1iZXJ9IHogdGhlIHNpemluZyBtb2RlIGluIHVzZSBmb3IgZGV0ZXJtaW5pbmcgc2l6ZSBpbiB0aGUgeiBkaXJlY3Rpb25cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01FbGVtZW50LnByb3RvdHlwZS5vblNpemVNb2RlQ2hhbmdlID0gZnVuY3Rpb24gb25TaXplTW9kZUNoYW5nZSh4LCB5LCB6KSB7XG4gICAgaWYgKHggPT09IFJFTkRFUl9TSVpFIHx8IHkgPT09IFJFTkRFUl9TSVpFIHx8IHogPT09IFJFTkRFUl9TSVpFKSB7XG4gICAgICAgIHRoaXMuX3JlbmRlclNpemVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fcmVxdWVzdFJlbmRlclNpemUgPSB0cnVlO1xuICAgIH1cbiAgICB0aGlzLm9uU2l6ZUNoYW5nZSh0aGlzLl9ub2RlLmdldFNpemUoKSk7XG59O1xuXG4vKipcbiAqIE1ldGhvZCB0byBiZSByZXRyaWV2ZSB0aGUgcmVuZGVyZWQgc2l6ZSBvZiB0aGUgRE9NIGVsZW1lbnQgdGhhdCBpc1xuICogZHJhd24gZm9yIHRoaXMgbm9kZS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7QXJyYXl9IHNpemUgb2YgdGhlIHJlbmRlcmVkIERPTSBlbGVtZW50IGluIHBpeGVsc1xuICovXG5ET01FbGVtZW50LnByb3RvdHlwZS5nZXRSZW5kZXJTaXplID0gZnVuY3Rpb24gZ2V0UmVuZGVyU2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fcmVuZGVyU2l6ZTtcbn07XG5cbi8qKlxuICogTWV0aG9kIHRvIGhhdmUgdGhlIGNvbXBvbmVudCByZXF1ZXN0IGFuIHVwZGF0ZSBmcm9tIGl0cyBOb2RlXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01FbGVtZW50LnByb3RvdHlwZS5fcmVxdWVzdFVwZGF0ZSA9IGZ1bmN0aW9uIF9yZXF1ZXN0VXBkYXRlKCkge1xuICAgIGlmICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSkge1xuICAgICAgICB0aGlzLl9ub2RlLnJlcXVlc3RVcGRhdGUodGhpcy5faWQpO1xuICAgICAgICB0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlID0gdHJ1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemVzIHRoZSBET01FbGVtZW50IGJ5IHNlbmRpbmcgdGhlIGBJTklUX0RPTWAgY29tbWFuZC4gVGhpcyBjcmVhdGVzXG4gKiBvciByZWFsbG9jYXRlcyBhIG5ldyBFbGVtZW50IGluIHRoZSBhY3R1YWwgRE9NIGhpZXJhcmNoeS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NRWxlbWVudC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgdGhpcy5fY2hhbmdlUXVldWUucHVzaCgnSU5JVF9ET00nLCB0aGlzLl90YWdOYW1lKTtcbiAgICB0aGlzLl9pbml0aWFsaXplZCA9IHRydWU7XG4gICAgdGhpcy5vblRyYW5zZm9ybUNoYW5nZSh0aGlzLl9ub2RlLmdldFRyYW5zZm9ybSgpKTtcbiAgICB0aGlzLm9uU2l6ZUNoYW5nZSh0aGlzLl9ub2RlLmdldFNpemUoKSk7XG4gICAgaWYgKCF0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlKSB0aGlzLl9yZXF1ZXN0VXBkYXRlKCk7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGlkIGF0dHJpYnV0ZSBvZiB0aGUgRE9NRWxlbWVudC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGlkIE5ldyBpZCB0byBiZSBzZXRcbiAqXG4gKiBAcmV0dXJuIHtET01FbGVtZW50fSB0aGlzXG4gKi9cbkRPTUVsZW1lbnQucHJvdG90eXBlLnNldElkID0gZnVuY3Rpb24gc2V0SWQgKGlkKSB7XG4gICAgdGhpcy5zZXRBdHRyaWJ1dGUoJ2lkJywgaWQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IGNsYXNzIHRvIHRoZSBpbnRlcm5hbCBjbGFzcyBsaXN0IG9mIHRoZSB1bmRlcmx5aW5nIEVsZW1lbnQgaW4gdGhlXG4gKiBET00uXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSBOZXcgY2xhc3MgbmFtZSB0byBiZSBhZGRlZFxuICpcbiAqIEByZXR1cm4ge0RPTUVsZW1lbnR9IHRoaXNcbiAqL1xuRE9NRWxlbWVudC5wcm90b3R5cGUuYWRkQ2xhc3MgPSBmdW5jdGlvbiBhZGRDbGFzcyAodmFsdWUpIHtcbiAgICBpZiAodGhpcy5fY2xhc3Nlcy5pbmRleE9mKHZhbHVlKSA8IDApIHtcbiAgICAgICAgaWYgKHRoaXMuX2luaXRpYWxpemVkKSB0aGlzLl9jaGFuZ2VRdWV1ZS5wdXNoKCdBRERfQ0xBU1MnLCB2YWx1ZSk7XG4gICAgICAgIHRoaXMuX2NsYXNzZXMucHVzaCh2YWx1ZSk7XG4gICAgICAgIGlmICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSkgdGhpcy5fcmVxdWVzdFVwZGF0ZSgpO1xuICAgICAgICBpZiAodGhpcy5fcmVuZGVyU2l6ZWQpIHRoaXMuX3JlcXVlc3RSZW5kZXJTaXplID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2luRHJhdykge1xuICAgICAgICBpZiAodGhpcy5faW5pdGlhbGl6ZWQpIHRoaXMuX2NoYW5nZVF1ZXVlLnB1c2goJ0FERF9DTEFTUycsIHZhbHVlKTtcbiAgICAgICAgaWYgKCF0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlKSB0aGlzLl9yZXF1ZXN0VXBkYXRlKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGEgY2xhc3MgZnJvbSB0aGUgRE9NRWxlbWVudCdzIGNsYXNzTGlzdC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIENsYXNzIG5hbWUgdG8gYmUgcmVtb3ZlZFxuICpcbiAqIEByZXR1cm4ge0RPTUVsZW1lbnR9IHRoaXNcbiAqL1xuRE9NRWxlbWVudC5wcm90b3R5cGUucmVtb3ZlQ2xhc3MgPSBmdW5jdGlvbiByZW1vdmVDbGFzcyAodmFsdWUpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl9jbGFzc2VzLmluZGV4T2YodmFsdWUpO1xuXG4gICAgaWYgKGluZGV4IDwgMCkgcmV0dXJuIHRoaXM7XG5cbiAgICB0aGlzLl9jaGFuZ2VRdWV1ZS5wdXNoKCdSRU1PVkVfQ0xBU1MnLCB2YWx1ZSk7XG5cbiAgICB0aGlzLl9jbGFzc2VzLnNwbGljZShpbmRleCwgMSk7XG5cbiAgICBpZiAoIXRoaXMuX3JlcXVlc3RpbmdVcGRhdGUpIHRoaXMuX3JlcXVlc3RVcGRhdGUoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIERPTUVsZW1lbnQgaGFzIHRoZSBwYXNzZWQgaW4gY2xhc3MuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSBUaGUgY2xhc3MgbmFtZVxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgaW5kaWNhdGluZyB3aGV0aGVyIHRoZSBwYXNzZWQgaW4gY2xhc3MgbmFtZSBpcyBpbiB0aGUgRE9NRWxlbWVudCdzIGNsYXNzIGxpc3QuXG4gKi9cbkRPTUVsZW1lbnQucHJvdG90eXBlLmhhc0NsYXNzID0gZnVuY3Rpb24gaGFzQ2xhc3MgKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NsYXNzZXMuaW5kZXhPZih2YWx1ZSkgIT09IC0xO1xufTtcblxuLyoqXG4gKiBTZXRzIGFuIGF0dHJpYnV0ZSBvZiB0aGUgRE9NRWxlbWVudC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgQXR0cmlidXRlIGtleSAoZS5nLiBgc3JjYClcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSBBdHRyaWJ1dGUgdmFsdWUgKGUuZy4gYGh0dHA6Ly9mYW1vLnVzYClcbiAqXG4gKiBAcmV0dXJuIHtET01FbGVtZW50fSB0aGlzXG4gKi9cbkRPTUVsZW1lbnQucHJvdG90eXBlLnNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIHNldEF0dHJpYnV0ZSAobmFtZSwgdmFsdWUpIHtcbiAgICBpZiAodGhpcy5fYXR0cmlidXRlc1tuYW1lXSAhPT0gdmFsdWUgfHwgdGhpcy5faW5EcmF3KSB7XG4gICAgICAgIHRoaXMuX2F0dHJpYnV0ZXNbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgaWYgKHRoaXMuX2luaXRpYWxpemVkKSB0aGlzLl9jaGFuZ2VRdWV1ZS5wdXNoKCdDSEFOR0VfQVRUUklCVVRFJywgbmFtZSwgdmFsdWUpO1xuICAgICAgICBpZiAoIXRoaXMuX3JlcXVlc3RVcGRhdGUpIHRoaXMuX3JlcXVlc3RVcGRhdGUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0cyBhIENTUyBwcm9wZXJ0eVxuICpcbiAqIEBjaGFpbmFibGVcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSAgTmFtZSBvZiB0aGUgQ1NTIHJ1bGUgKGUuZy4gYGJhY2tncm91bmQtY29sb3JgKVxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIFZhbHVlIG9mIENTUyBwcm9wZXJ0eSAoZS5nLiBgcmVkYClcbiAqXG4gKiBAcmV0dXJuIHtET01FbGVtZW50fSB0aGlzXG4gKi9cbkRPTUVsZW1lbnQucHJvdG90eXBlLnNldFByb3BlcnR5ID0gZnVuY3Rpb24gc2V0UHJvcGVydHkgKG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKHRoaXMuX3N0eWxlc1tuYW1lXSAhPT0gdmFsdWUgfHwgdGhpcy5faW5EcmF3KSB7XG4gICAgICAgIHRoaXMuX3N0eWxlc1tuYW1lXSA9IHZhbHVlO1xuICAgICAgICBpZiAodGhpcy5faW5pdGlhbGl6ZWQpIHRoaXMuX2NoYW5nZVF1ZXVlLnB1c2goJ0NIQU5HRV9QUk9QRVJUWScsIG5hbWUsIHZhbHVlKTtcbiAgICAgICAgaWYgKCF0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlKSB0aGlzLl9yZXF1ZXN0VXBkYXRlKCk7XG4gICAgICAgIGlmICh0aGlzLl9yZW5kZXJTaXplZCkgdGhpcy5fcmVxdWVzdFJlbmRlclNpemUgPSB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBjb250ZW50IG9mIHRoZSBET01FbGVtZW50LiBUaGlzIGlzIHVzaW5nIGBpbm5lckhUTUxgLCBlc2NhcGluZyB1c2VyXG4gKiBnZW5lcmF0ZWQgY29udGVudCBpcyB0aGVyZWZvcmUgZXNzZW50aWFsIGZvciBzZWN1cml0eSBwdXJwb3Nlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGNvbnRlbnQgQ29udGVudCB0byBiZSBzZXQgdXNpbmcgYC5pbm5lckhUTUwgPSAuLi5gXG4gKlxuICogQHJldHVybiB7RE9NRWxlbWVudH0gdGhpc1xuICovXG5ET01FbGVtZW50LnByb3RvdHlwZS5zZXRDb250ZW50ID0gZnVuY3Rpb24gc2V0Q29udGVudCAoY29udGVudCkge1xuICAgIGlmICh0aGlzLl9jb250ZW50ICE9PSBjb250ZW50IHx8IHRoaXMuX2luRHJhdykge1xuICAgICAgICB0aGlzLl9jb250ZW50ID0gY29udGVudDtcbiAgICAgICAgaWYgKHRoaXMuX2luaXRpYWxpemVkKSB0aGlzLl9jaGFuZ2VRdWV1ZS5wdXNoKCdDSEFOR0VfQ09OVEVOVCcsIGNvbnRlbnQpO1xuICAgICAgICBpZiAoIXRoaXMuX3JlcXVlc3RpbmdVcGRhdGUpIHRoaXMuX3JlcXVlc3RVcGRhdGUoKTtcbiAgICAgICAgaWYgKHRoaXMuX3JlbmRlclNpemVkKSB0aGlzLl9yZXF1ZXN0UmVuZGVyU2l6ZSA9IHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFN1YnNjcmliZXMgdG8gYSBET01FbGVtZW50IHVzaW5nLlxuICpcbiAqIEBtZXRob2Qgb25cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgICAgICAgVGhlIGV2ZW50IHR5cGUgKGUuZy4gYGNsaWNrYCkuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciAgSGFuZGxlciBmdW5jdGlvbiBmb3IgdGhlIHNwZWNpZmllZCBldmVudCB0eXBlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluIHdoaWNoIHRoZSBwYXlsb2FkIGV2ZW50IG9iamVjdCB3aWxsIGJlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhc3NlZCBpbnRvLlxuICpcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSBBIGZ1bmN0aW9uIHRvIGNhbGwgaWYgeW91IHdhbnQgdG8gcmVtb3ZlIHRoZSBjYWxsYmFja1xuICovXG5ET01FbGVtZW50LnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uIChldmVudCwgbGlzdGVuZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fY2FsbGJhY2tzLm9uKGV2ZW50LCBsaXN0ZW5lcik7XG59O1xuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIGJlIGludm9rZWQgYnkgdGhlIE5vZGUgd2hlbmV2ZXIgYW4gZXZlbnQgaXMgYmVpbmcgcmVjZWl2ZWQuXG4gKiBUaGVyZSBhcmUgdHdvIGRpZmZlcmVudCB3YXlzIHRvIHN1YnNjcmliZSBmb3IgdGhvc2UgZXZlbnRzOlxuICpcbiAqIDEuIEJ5IG92ZXJyaWRpbmcgdGhlIG9uUmVjZWl2ZSBtZXRob2QgKGFuZCBwb3NzaWJseSB1c2luZyBgc3dpdGNoYCBpbiBvcmRlclxuICogICAgIHRvIGRpZmZlcmVudGlhdGUgYmV0d2VlbiB0aGUgZGlmZmVyZW50IGV2ZW50IHR5cGVzKS5cbiAqIDIuIEJ5IHVzaW5nIERPTUVsZW1lbnQgYW5kIHVzaW5nIHRoZSBidWlsdC1pbiBDYWxsYmFja1N0b3JlLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgRXZlbnQgdHlwZSAoZS5nLiBgY2xpY2tgKVxuICogQHBhcmFtIHtPYmplY3R9IHBheWxvYWQgRXZlbnQgb2JqZWN0LlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTUVsZW1lbnQucHJvdG90eXBlLm9uUmVjZWl2ZSA9IGZ1bmN0aW9uIG9uUmVjZWl2ZSAoZXZlbnQsIHBheWxvYWQpIHtcbiAgICBpZiAoZXZlbnQgPT09ICdyZXNpemUnKSB7XG4gICAgICAgIHRoaXMuX3JlbmRlclNpemVbMF0gPSBwYXlsb2FkLnZhbFswXTtcbiAgICAgICAgdGhpcy5fcmVuZGVyU2l6ZVsxXSA9IHBheWxvYWQudmFsWzFdO1xuICAgICAgICBpZiAoIXRoaXMuX3JlcXVlc3RpbmdVcGRhdGUpIHRoaXMuX3JlcXVlc3RVcGRhdGUoKTtcbiAgICB9XG4gICAgdGhpcy5fY2FsbGJhY2tzLnRyaWdnZXIoZXZlbnQsIHBheWxvYWQpO1xufTtcblxuLyoqXG4gKiBUaGUgZHJhdyBmdW5jdGlvbiBpcyBiZWluZyB1c2VkIGluIG9yZGVyIHRvIGFsbG93IG11dGF0aW5nIHRoZSBET01FbGVtZW50XG4gKiBiZWZvcmUgYWN0dWFsbHkgbW91bnRpbmcgdGhlIGNvcnJlc3BvbmRpbmcgbm9kZS5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTUVsZW1lbnQucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiBkcmF3KCkge1xuICAgIHZhciBrZXk7XG4gICAgdmFyIGk7XG4gICAgdmFyIGxlbjtcblxuICAgIHRoaXMuX2luRHJhdyA9IHRydWU7XG5cbiAgICB0aGlzLmluaXQoKTtcblxuICAgIGZvciAoaSA9IDAsIGxlbiA9IHRoaXMuX2NsYXNzZXMubGVuZ3RoIDsgaSA8IGxlbiA7IGkrKylcbiAgICAgICAgdGhpcy5hZGRDbGFzcyh0aGlzLl9jbGFzc2VzW2ldKTtcblxuICAgIGlmICh0aGlzLl9jb250ZW50KSB0aGlzLnNldENvbnRlbnQodGhpcy5fY29udGVudCk7XG5cbiAgICBmb3IgKGtleSBpbiB0aGlzLl9zdHlsZXMpXG4gICAgICAgIGlmICh0aGlzLl9zdHlsZXNba2V5XSlcbiAgICAgICAgICAgIHRoaXMuc2V0UHJvcGVydHkoa2V5LCB0aGlzLl9zdHlsZXNba2V5XSk7XG5cbiAgICBmb3IgKGtleSBpbiB0aGlzLl9hdHRyaWJ1dGVzKVxuICAgICAgICBpZiAodGhpcy5fYXR0cmlidXRlc1trZXldKVxuICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGUoa2V5LCB0aGlzLl9hdHRyaWJ1dGVzW2tleV0pO1xuXG4gICAgZm9yIChpID0gMCwgbGVuID0gdGhpcy5fVUlFdmVudHMubGVuZ3RoIDsgaSA8IGxlbiA7IGkrKylcbiAgICAgICAgdGhpcy5vbkFkZFVJRXZlbnQodGhpcy5fVUlFdmVudHNbaV0pO1xuXG4gICAgdGhpcy5faW5EcmF3ID0gZmFsc2U7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IERPTUVsZW1lbnQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFbGVtZW50Q2FjaGUgPSByZXF1aXJlKCcuL0VsZW1lbnRDYWNoZScpO1xudmFyIG1hdGggPSByZXF1aXJlKCcuL01hdGgnKTtcbnZhciB2ZW5kb3JQcmVmaXggPSByZXF1aXJlKCcuLi91dGlsaXRpZXMvdmVuZG9yUHJlZml4Jyk7XG52YXIgZXZlbnRNYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9FdmVudE1hcCcpO1xuXG52YXIgVFJBTlNGT1JNID0gbnVsbDtcblxuLyoqXG4gKiBET01SZW5kZXJlciBpcyBhIGNsYXNzIHJlc3BvbnNpYmxlIGZvciBhZGRpbmcgZWxlbWVudHNcbiAqIHRvIHRoZSBET00gYW5kIHdyaXRpbmcgdG8gdGhvc2UgZWxlbWVudHMuXG4gKiBUaGVyZSBpcyBhIERPTVJlbmRlcmVyIHBlciBjb250ZXh0LCByZXByZXNlbnRlZCBhcyBhblxuICogZWxlbWVudCBhbmQgYSBzZWxlY3Rvci4gSXQgaXMgaW5zdGFudGlhdGVkIGluIHRoZVxuICogY29udGV4dCBjbGFzcy5cbiAqXG4gKiBAY2xhc3MgRE9NUmVuZGVyZXJcbiAqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50IGFuIGVsZW1lbnQuXG4gKiBAcGFyYW0ge1N0cmluZ30gc2VsZWN0b3IgdGhlIHNlbGVjdG9yIG9mIHRoZSBlbGVtZW50LlxuICogQHBhcmFtIHtDb21wb3NpdG9yfSBjb21wb3NpdG9yIHRoZSBjb21wb3NpdG9yIGNvbnRyb2xsaW5nIHRoZSByZW5kZXJlclxuICovXG5mdW5jdGlvbiBET01SZW5kZXJlciAoZWxlbWVudCwgc2VsZWN0b3IsIGNvbXBvc2l0b3IpIHtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2ZhbW91cy1kb20tcmVuZGVyZXInKTtcblxuICAgIFRSQU5TRk9STSA9IFRSQU5TRk9STSB8fCB2ZW5kb3JQcmVmaXgoJ3RyYW5zZm9ybScpO1xuICAgIHRoaXMuX2NvbXBvc2l0b3IgPSBjb21wb3NpdG9yOyAvLyBhIHJlZmVyZW5jZSB0byB0aGUgY29tcG9zaXRvclxuXG4gICAgdGhpcy5fdGFyZ2V0ID0gbnVsbDsgLy8gYSByZWdpc3RlciBmb3IgaG9sZGluZyB0aGUgY3VycmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVsZW1lbnQgdGhhdCB0aGUgUmVuZGVyZXIgaXMgb3BlcmF0aW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXBvblxuXG4gICAgdGhpcy5fcGFyZW50ID0gbnVsbDsgLy8gYSByZWdpc3RlciBmb3IgaG9sZGluZyB0aGUgcGFyZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gb2YgdGhlIHRhcmdldFxuXG4gICAgdGhpcy5fcGF0aCA9IG51bGw7IC8vIGEgcmVnaXN0ZXIgZm9yIGhvbGRpbmcgdGhlIHBhdGggb2YgdGhlIHRhcmdldFxuICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIHJlZ2lzdGVyIG11c3QgYmUgc2V0IGZpcnN0LCBhbmQgdGhlblxuICAgICAgICAgICAgICAgICAgICAgICAvLyBjaGlsZHJlbiwgdGFyZ2V0LCBhbmQgcGFyZW50IGFyZSBhbGwgbG9va2VkXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHVwIGZyb20gdGhhdC5cblxuICAgIHRoaXMuX2NoaWxkcmVuID0gW107IC8vIGEgcmVnaXN0ZXIgZm9yIGhvbGRpbmcgdGhlIGNoaWxkcmVuIG9mIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGN1cnJlbnQgdGFyZ2V0LlxuXG4gICAgdGhpcy5fcm9vdCA9IG5ldyBFbGVtZW50Q2FjaGUoZWxlbWVudCwgc2VsZWN0b3IpOyAvLyB0aGUgcm9vdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb2YgdGhlIGRvbSB0cmVlIHRoYXQgdGhpc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVuZGVyZXIgaXMgcmVzcG9uc2libGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZvclxuXG4gICAgdGhpcy5fYm91bmRUcmlnZ2VyRXZlbnQgPSB0aGlzLl90cmlnZ2VyRXZlbnQuYmluZCh0aGlzKTtcblxuICAgIHRoaXMuX3NlbGVjdG9yID0gc2VsZWN0b3I7XG5cbiAgICB0aGlzLl9lbGVtZW50cyA9IHt9O1xuXG4gICAgdGhpcy5fZWxlbWVudHNbc2VsZWN0b3JdID0gdGhpcy5fcm9vdDtcblxuICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm0gPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSk7XG4gICAgdGhpcy5fVlB0cmFuc2Zvcm0gPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSk7XG5cbiAgICB0aGlzLl9zaXplID0gW251bGwsIG51bGxdO1xufVxuXG5cbi8qKlxuICogQXR0YWNoZXMgYW4gRXZlbnRMaXN0ZW5lciB0byB0aGUgZWxlbWVudCBhc3NvY2lhdGVkIHdpdGggdGhlIHBhc3NlZCBpbiBwYXRoLlxuICogUHJldmVudHMgdGhlIGRlZmF1bHQgYnJvd3NlciBhY3Rpb24gb24gYWxsIHN1YnNlcXVlbnQgZXZlbnRzIGlmXG4gKiBgcHJldmVudERlZmF1bHRgIGlzIHRydXRoeS5cbiAqIEFsbCBpbmNvbWluZyBldmVudHMgd2lsbCBiZSBmb3J3YXJkZWQgdG8gdGhlIGNvbXBvc2l0b3IgYnkgaW52b2tpbmcgdGhlXG4gKiBgc2VuZEV2ZW50YCBtZXRob2QuXG4gKiBEZWxlZ2F0ZXMgZXZlbnRzIGlmIHBvc3NpYmxlIGJ5IGF0dGFjaGluZyB0aGUgZXZlbnQgbGlzdGVuZXIgdG8gdGhlIGNvbnRleHQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIERPTSBldmVudCB0eXBlIChlLmcuIGNsaWNrLCBtb3VzZW92ZXIpLlxuICogQHBhcmFtIHtCb29sZWFufSBwcmV2ZW50RGVmYXVsdCBXaGV0aGVyIG9yIG5vdCB0aGUgZGVmYXVsdCBicm93c2VyIGFjdGlvbiBzaG91bGQgYmUgcHJldmVudGVkLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5zdWJzY3JpYmUgPSBmdW5jdGlvbiBzdWJzY3JpYmUodHlwZSwgcHJldmVudERlZmF1bHQpIHtcbiAgICAvLyBUT0RPIHByZXZlbnREZWZhdWx0IHNob3VsZCBiZSBhIHNlcGFyYXRlIGNvbW1hbmRcbiAgICB0aGlzLl9hc3NlcnRUYXJnZXRMb2FkZWQoKTtcblxuICAgIHRoaXMuX3RhcmdldC5wcmV2ZW50RGVmYXVsdFt0eXBlXSA9IHByZXZlbnREZWZhdWx0O1xuICAgIHRoaXMuX3RhcmdldC5zdWJzY3JpYmVbdHlwZV0gPSB0cnVlO1xuXG4gICAgaWYgKFxuICAgICAgICAhdGhpcy5fdGFyZ2V0Lmxpc3RlbmVyc1t0eXBlXSAmJiAhdGhpcy5fcm9vdC5saXN0ZW5lcnNbdHlwZV1cbiAgICApIHtcbiAgICAgICAgdmFyIHRhcmdldCA9IGV2ZW50TWFwW3R5cGVdWzFdID8gdGhpcy5fcm9vdCA6IHRoaXMuX3RhcmdldDtcbiAgICAgICAgdGFyZ2V0Lmxpc3RlbmVyc1t0eXBlXSA9IHRoaXMuX2JvdW5kVHJpZ2dlckV2ZW50O1xuICAgICAgICB0YXJnZXQuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIHRoaXMuX2JvdW5kVHJpZ2dlckV2ZW50KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIGJlIGFkZGVkIHVzaW5nIGBhZGRFdmVudExpc3RlbmVyYCB0byB0aGUgY29ycmVzcG9uZGluZ1xuICogRE9NRWxlbWVudC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2IERPTSBFdmVudCBwYXlsb2FkXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLl90cmlnZ2VyRXZlbnQgPSBmdW5jdGlvbiBfdHJpZ2dlckV2ZW50KGV2KSB7XG4gICAgLy8gVXNlIGV2LnBhdGgsIHdoaWNoIGlzIGFuIGFycmF5IG9mIEVsZW1lbnRzIChwb2x5ZmlsbGVkIGlmIG5lZWRlZCkuXG4gICAgdmFyIGV2UGF0aCA9IGV2LnBhdGggPyBldi5wYXRoIDogX2dldFBhdGgoZXYpO1xuICAgIC8vIEZpcnN0IGVsZW1lbnQgaW4gdGhlIHBhdGggaXMgdGhlIGVsZW1lbnQgb24gd2hpY2ggdGhlIGV2ZW50IGhhcyBhY3R1YWxseVxuICAgIC8vIGJlZW4gZW1pdHRlZC5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV2UGF0aC5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyBTa2lwIG5vZGVzIHRoYXQgZG9uJ3QgaGF2ZSBhIGRhdGFzZXQgcHJvcGVydHkgb3IgZGF0YS1mYS1wYXRoXG4gICAgICAgIC8vIGF0dHJpYnV0ZS5cbiAgICAgICAgaWYgKCFldlBhdGhbaV0uZGF0YXNldCkgY29udGludWU7XG4gICAgICAgIHZhciBwYXRoID0gZXZQYXRoW2ldLmRhdGFzZXQuZmFQYXRoO1xuICAgICAgICBpZiAoIXBhdGgpIGNvbnRpbnVlO1xuXG4gICAgICAgIC8vIFN0b3AgZnVydGhlciBldmVudCBwcm9wb2dhdGlvbiBhbmQgcGF0aCB0cmF2ZXJzYWwgYXMgc29vbiBhcyB0aGVcbiAgICAgICAgLy8gZmlyc3QgRWxlbWVudENhY2hlIHN1YnNjcmliaW5nIGZvciB0aGUgZW1pdHRlZCBldmVudCBoYXMgYmVlbiBmb3VuZC5cbiAgICAgICAgaWYgKHRoaXMuX2VsZW1lbnRzW3BhdGhdLnN1YnNjcmliZVtldi50eXBlXSkge1xuICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHkgcHJldmVudERlZmF1bHQuIFRoaXMgbmVlZHMgZm9ydGhlciBjb25zaWRlcmF0aW9uIGFuZFxuICAgICAgICAgICAgLy8gc2hvdWxkIGJlIG9wdGlvbmFsLiBFdmVudHVhbGx5IHRoaXMgc2hvdWxkIGJlIGEgc2VwYXJhdGUgY29tbWFuZC9cbiAgICAgICAgICAgIC8vIG1ldGhvZC5cbiAgICAgICAgICAgIGlmICh0aGlzLl9lbGVtZW50c1twYXRoXS5wcmV2ZW50RGVmYXVsdFtldi50eXBlXSkge1xuICAgICAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBOb3JtYWxpemVkRXZlbnRDb25zdHJ1Y3RvciA9IGV2ZW50TWFwW2V2LnR5cGVdWzBdO1xuXG4gICAgICAgICAgICAvLyBGaW5hbGx5IHNlbmQgdGhlIGV2ZW50IHRvIHRoZSBXb3JrZXIgVGhyZWFkIHRocm91Z2ggdGhlXG4gICAgICAgICAgICAvLyBjb21wb3NpdG9yLlxuICAgICAgICAgICAgdGhpcy5fY29tcG9zaXRvci5zZW5kRXZlbnQocGF0aCwgZXYudHlwZSwgbmV3IE5vcm1hbGl6ZWRFdmVudENvbnN0cnVjdG9yKGV2KSk7XG5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuXG4vKipcbiAqIGdldFNpemVPZiBnZXRzIHRoZSBkb20gc2l6ZSBvZiBhIHBhcnRpY3VsYXIgRE9NIGVsZW1lbnQuICBUaGlzIGlzXG4gKiBuZWVkZWQgZm9yIHJlbmRlciBzaXppbmcgaW4gdGhlIHNjZW5lIGdyYXBoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBwYXRoIG9mIHRoZSBOb2RlIGluIHRoZSBzY2VuZSBncmFwaFxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBhIHZlYzMgb2YgdGhlIG9mZnNldCBzaXplIG9mIHRoZSBkb20gZWxlbWVudFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuZ2V0U2l6ZU9mID0gZnVuY3Rpb24gZ2V0U2l6ZU9mKHBhdGgpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnRzW3BhdGhdO1xuICAgIGlmICghZWxlbWVudCkgcmV0dXJuIG51bGw7XG5cbiAgICB2YXIgcmVzID0ge3ZhbDogZWxlbWVudC5zaXplfTtcbiAgICB0aGlzLl9jb21wb3NpdG9yLnNlbmRFdmVudChwYXRoLCAncmVzaXplJywgcmVzKTtcbiAgICByZXR1cm4gcmVzO1xufTtcblxuZnVuY3Rpb24gX2dldFBhdGgoZXYpIHtcbiAgICAvLyBUT0RPIG1vdmUgaW50byBfdHJpZ2dlckV2ZW50LCBhdm9pZCBvYmplY3QgYWxsb2NhdGlvblxuICAgIHZhciBwYXRoID0gW107XG4gICAgdmFyIG5vZGUgPSBldi50YXJnZXQ7XG4gICAgd2hpbGUgKG5vZGUgIT09IGRvY3VtZW50LmJvZHkpIHtcbiAgICAgICAgcGF0aC5wdXNoKG5vZGUpO1xuICAgICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbn1cblxuXG4vKipcbiAqIERldGVybWluZXMgdGhlIHNpemUgb2YgdGhlIGNvbnRleHQgYnkgcXVlcnlpbmcgdGhlIERPTSBmb3IgYG9mZnNldFdpZHRoYCBhbmRcbiAqIGBvZmZzZXRIZWlnaHRgLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gT2Zmc2V0IHNpemUuXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5nZXRTaXplID0gZnVuY3Rpb24gZ2V0U2l6ZSgpIHtcbiAgICB0aGlzLl9zaXplWzBdID0gdGhpcy5fcm9vdC5lbGVtZW50Lm9mZnNldFdpZHRoO1xuICAgIHRoaXMuX3NpemVbMV0gPSB0aGlzLl9yb290LmVsZW1lbnQub2Zmc2V0SGVpZ2h0O1xuICAgIHJldHVybiB0aGlzLl9zaXplO1xufTtcblxuRE9NUmVuZGVyZXIucHJvdG90eXBlLl9nZXRTaXplID0gRE9NUmVuZGVyZXIucHJvdG90eXBlLmdldFNpemU7XG5cblxuLyoqXG4gKiBFeGVjdXRlcyB0aGUgcmV0cmlldmVkIGRyYXcgY29tbWFuZHMuIERyYXcgY29tbWFuZHMgb25seSByZWZlciB0byB0aGVcbiAqIGNyb3NzLWJyb3dzZXIgbm9ybWFsaXplZCBgdHJhbnNmb3JtYCBwcm9wZXJ0eS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlbmRlclN0YXRlIGRlc2NyaXB0aW9uXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiBkcmF3KHJlbmRlclN0YXRlKSB7XG4gICAgaWYgKHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlRGlydHkpIHtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZURpcnR5ID0gdHJ1ZTtcblxuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzBdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMF07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMV0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxXTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsyXSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzJdO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzNdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bM107XG5cbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs0XSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzRdO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzVdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bNV07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bNl0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs2XTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs3XSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzddO1xuXG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bOF0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs4XTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs5XSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzldO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzEwXSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzEwXTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMV0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMV07XG5cbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMl0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMl07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTNdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTNdO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzE0XSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzE0XTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxNV0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxNV07XG4gICAgfVxuXG4gICAgaWYgKHJlbmRlclN0YXRlLnZpZXdEaXJ0eSB8fCByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZURpcnR5KSB7XG4gICAgICAgIG1hdGgubXVsdGlwbHkodGhpcy5fVlB0cmFuc2Zvcm0sIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm0sIHJlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm0pO1xuICAgICAgICB0aGlzLl9yb290LmVsZW1lbnQuc3R5bGVbVFJBTlNGT1JNXSA9IHRoaXMuX3N0cmluZ2lmeU1hdHJpeCh0aGlzLl9WUHRyYW5zZm9ybSk7XG4gICAgfVxufTtcblxuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBmdW5jdGlvbiB1c2VkIGZvciBlbnN1cmluZyB0aGF0IGEgcGF0aCBpcyBjdXJyZW50bHkgbG9hZGVkLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLl9hc3NlcnRQYXRoTG9hZGVkID0gZnVuY3Rpb24gX2Fzc2VyUGF0aExvYWRlZCgpIHtcbiAgICBpZiAoIXRoaXMuX3BhdGgpIHRocm93IG5ldyBFcnJvcigncGF0aCBub3QgbG9hZGVkJyk7XG59O1xuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBmdW5jdGlvbiB1c2VkIGZvciBlbnN1cmluZyB0aGF0IGEgcGFyZW50IGlzIGN1cnJlbnRseSBsb2FkZWQuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuX2Fzc2VydFBhcmVudExvYWRlZCA9IGZ1bmN0aW9uIF9hc3NlcnRQYXJlbnRMb2FkZWQoKSB7XG4gICAgaWYgKCF0aGlzLl9wYXJlbnQpIHRocm93IG5ldyBFcnJvcigncGFyZW50IG5vdCBsb2FkZWQnKTtcbn07XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIGZ1bmN0aW9uIHVzZWQgZm9yIGVuc3VyaW5nIHRoYXQgY2hpbGRyZW4gYXJlIGN1cnJlbnRseVxuICogbG9hZGVkLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLl9hc3NlcnRDaGlsZHJlbkxvYWRlZCA9IGZ1bmN0aW9uIF9hc3NlcnRDaGlsZHJlbkxvYWRlZCgpIHtcbiAgICBpZiAoIXRoaXMuX2NoaWxkcmVuKSB0aHJvdyBuZXcgRXJyb3IoJ2NoaWxkcmVuIG5vdCBsb2FkZWQnKTtcbn07XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIGZ1bmN0aW9uIHVzZWQgZm9yIGVuc3VyaW5nIHRoYXQgYSB0YXJnZXQgaXMgY3VycmVudGx5IGxvYWRlZC5cbiAqXG4gKiBAbWV0aG9kICBfYXNzZXJ0VGFyZ2V0TG9hZGVkXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLl9hc3NlcnRUYXJnZXRMb2FkZWQgPSBmdW5jdGlvbiBfYXNzZXJ0VGFyZ2V0TG9hZGVkKCkge1xuICAgIGlmICghdGhpcy5fdGFyZ2V0KSB0aHJvdyBuZXcgRXJyb3IoJ05vIHRhcmdldCBsb2FkZWQnKTtcbn07XG5cbi8qKlxuICogRmluZHMgYW5kIHNldHMgdGhlIHBhcmVudCBvZiB0aGUgY3VycmVudGx5IGxvYWRlZCBlbGVtZW50IChwYXRoKS5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEByZXR1cm4ge0VsZW1lbnRDYWNoZX0gUGFyZW50IGVsZW1lbnQuXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5maW5kUGFyZW50ID0gZnVuY3Rpb24gZmluZFBhcmVudCAoKSB7XG4gICAgdGhpcy5fYXNzZXJ0UGF0aExvYWRlZCgpO1xuXG4gICAgdmFyIHBhdGggPSB0aGlzLl9wYXRoO1xuICAgIHZhciBwYXJlbnQ7XG5cbiAgICB3aGlsZSAoIXBhcmVudCAmJiBwYXRoLmxlbmd0aCkge1xuICAgICAgICBwYXRoID0gcGF0aC5zdWJzdHJpbmcoMCwgcGF0aC5sYXN0SW5kZXhPZignLycpKTtcbiAgICAgICAgcGFyZW50ID0gdGhpcy5fZWxlbWVudHNbcGF0aF07XG4gICAgfVxuICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcbiAgICByZXR1cm4gcGFyZW50O1xufTtcblxuXG4vKipcbiAqIEZpbmRzIGFsbCBjaGlsZHJlbiBvZiB0aGUgY3VycmVudGx5IGxvYWRlZCBlbGVtZW50LlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtIHtBcnJheX0gYXJyYXkgT3V0cHV0LUFycmF5IHVzZWQgZm9yIHdyaXRpbmcgdG8gKHN1YnNlcXVlbnRseSBhcHBlbmRpbmcgY2hpbGRyZW4pXG4gKlxuICogQHJldHVybiB7QXJyYXl9IGFycmF5IG9mIGNoaWxkcmVuIGVsZW1lbnRzXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5maW5kQ2hpbGRyZW4gPSBmdW5jdGlvbiBmaW5kQ2hpbGRyZW4oYXJyYXkpIHtcbiAgICAvLyBUT0RPOiBPcHRpbWl6ZSBtZS5cbiAgICB0aGlzLl9hc3NlcnRQYXRoTG9hZGVkKCk7XG5cbiAgICB2YXIgcGF0aCA9IHRoaXMuX3BhdGggKyAnLyc7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLl9lbGVtZW50cyk7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBsZW47XG4gICAgYXJyYXkgPSBhcnJheSA/IGFycmF5IDogdGhpcy5fY2hpbGRyZW47XG5cbiAgICB0aGlzLl9jaGlsZHJlbi5sZW5ndGggPSAwO1xuXG4gICAgd2hpbGUgKGkgPCBrZXlzLmxlbmd0aCkge1xuICAgICAgICBpZiAoa2V5c1tpXS5pbmRleE9mKHBhdGgpID09PSAtMSB8fCBrZXlzW2ldID09PSBwYXRoKSBrZXlzLnNwbGljZShpLCAxKTtcbiAgICAgICAgZWxzZSBpKys7XG4gICAgfVxuICAgIHZhciBjdXJyZW50UGF0aDtcbiAgICB2YXIgaiA9IDA7XG4gICAgZm9yIChpID0gMCA7IGkgPCBrZXlzLmxlbmd0aCA7IGkrKykge1xuICAgICAgICBjdXJyZW50UGF0aCA9IGtleXNbaV07XG4gICAgICAgIGZvciAoaiA9IDAgOyBqIDwga2V5cy5sZW5ndGggOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChpICE9PSBqICYmIGtleXNbal0uaW5kZXhPZihjdXJyZW50UGF0aCkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAga2V5cy5zcGxpY2UoaiwgMSk7XG4gICAgICAgICAgICAgICAgaS0tO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAoaSA9IDAsIGxlbiA9IGtleXMubGVuZ3RoIDsgaSA8IGxlbiA7IGkrKylcbiAgICAgICAgYXJyYXlbaV0gPSB0aGlzLl9lbGVtZW50c1trZXlzW2ldXTtcblxuICAgIHJldHVybiBhcnJheTtcbn07XG5cblxuLyoqXG4gKiBVc2VkIGZvciBkZXRlcm1pbmluZyB0aGUgdGFyZ2V0IGxvYWRlZCB1bmRlciB0aGUgY3VycmVudCBwYXRoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtFbGVtZW50Q2FjaGV8dW5kZWZpbmVkfSBFbGVtZW50IGxvYWRlZCB1bmRlciBkZWZpbmVkIHBhdGguXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5maW5kVGFyZ2V0ID0gZnVuY3Rpb24gZmluZFRhcmdldCgpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0aGlzLl9lbGVtZW50c1t0aGlzLl9wYXRoXTtcbiAgICByZXR1cm4gdGhpcy5fdGFyZ2V0O1xufTtcblxuXG4vKipcbiAqIExvYWRzIHRoZSBwYXNzZWQgaW4gcGF0aC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB0byBiZSBsb2FkZWRcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IExvYWRlZCBwYXRoXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5sb2FkUGF0aCA9IGZ1bmN0aW9uIGxvYWRQYXRoIChwYXRoKSB7XG4gICAgdGhpcy5fcGF0aCA9IHBhdGg7XG4gICAgcmV0dXJuIHRoaXMuX3BhdGg7XG59O1xuXG5cbi8qKlxuICogSW5zZXJ0cyBhIERPTUVsZW1lbnQgYXQgdGhlIGN1cnJlbnRseSBsb2FkZWQgcGF0aCwgYXNzdW1pbmcgbm8gdGFyZ2V0IGlzXG4gKiBsb2FkZWQuIE9ubHkgb25lIERPTUVsZW1lbnQgY2FuIGJlIGFzc29jaWF0ZWQgd2l0aCBlYWNoIHBhdGguXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0YWdOYW1lIFRhZyBuYW1lIChjYXBpdGFsaXphdGlvbiB3aWxsIGJlIG5vcm1hbGl6ZWQpLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5pbnNlcnRFbCA9IGZ1bmN0aW9uIGluc2VydEVsICh0YWdOYW1lKSB7XG4gICAgaWYgKCF0aGlzLl90YXJnZXQgfHxcbiAgICAgICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gdGFnTmFtZS50b0xvd2VyQ2FzZSgpKSB7XG5cbiAgICAgICAgdGhpcy5maW5kUGFyZW50KCk7XG4gICAgICAgIHRoaXMuZmluZENoaWxkcmVuKCk7XG5cbiAgICAgICAgdGhpcy5fYXNzZXJ0UGFyZW50TG9hZGVkKCk7XG4gICAgICAgIHRoaXMuX2Fzc2VydENoaWxkcmVuTG9hZGVkKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX3RhcmdldCkgdGhpcy5fcGFyZW50LmVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5fdGFyZ2V0LmVsZW1lbnQpO1xuXG4gICAgICAgIHRoaXMuX3RhcmdldCA9IG5ldyBFbGVtZW50Q2FjaGUoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKSwgdGhpcy5fcGF0aCk7XG4gICAgICAgIHRoaXMuX3BhcmVudC5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuX3RhcmdldC5lbGVtZW50KTtcbiAgICAgICAgdGhpcy5fZWxlbWVudHNbdGhpcy5fcGF0aF0gPSB0aGlzLl90YXJnZXQ7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMuX2NoaWxkcmVuLmxlbmd0aCA7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuX2NoaWxkcmVuW2ldLmVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuXG4vKipcbiAqIFNldHMgYSBwcm9wZXJ0eSBvbiB0aGUgY3VycmVudGx5IGxvYWRlZCB0YXJnZXQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFByb3BlcnR5IG5hbWUgKGUuZy4gYmFja2dyb3VuZCwgY29sb3IsIGZvbnQpXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgUHJvcHJ0eSB2YWx1ZSAoZS5nLiBibGFjaywgMjBweClcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuc2V0UHJvcGVydHkgPSBmdW5jdGlvbiBzZXRQcm9wZXJ0eSAobmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLl9hc3NlcnRUYXJnZXRMb2FkZWQoKTtcbiAgICB0aGlzLl90YXJnZXQuZWxlbWVudC5zdHlsZVtuYW1lXSA9IHZhbHVlO1xufTtcblxuXG4vKipcbiAqIFNldHMgdGhlIHNpemUgb2YgdGhlIGN1cnJlbnRseSBsb2FkZWQgdGFyZ2V0LlxuICogUmVtb3ZlcyBhbnkgZXhwbGljaXQgc2l6aW5nIGNvbnN0cmFpbnRzIHdoZW4gcGFzc2VkIGluIGBmYWxzZWBcbiAqIChcInRydWUtc2l6aW5nXCIpLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcnxmYWxzZX0gd2lkdGggICBXaWR0aCB0byBiZSBzZXQuXG4gKiBAcGFyYW0ge051bWJlcnxmYWxzZX0gaGVpZ2h0ICBIZWlnaHQgdG8gYmUgc2V0LlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5zZXRTaXplID0gZnVuY3Rpb24gc2V0U2l6ZSAod2lkdGgsIGhlaWdodCkge1xuICAgIHRoaXMuX2Fzc2VydFRhcmdldExvYWRlZCgpO1xuXG4gICAgdGhpcy5zZXRXaWR0aCh3aWR0aCk7XG4gICAgdGhpcy5zZXRIZWlnaHQoaGVpZ2h0KTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgd2lkdGggb2YgdGhlIGN1cnJlbnRseSBsb2FkZWQgdGFyZ2V0LlxuICogUmVtb3ZlcyBhbnkgZXhwbGljaXQgc2l6aW5nIGNvbnN0cmFpbnRzIHdoZW4gcGFzc2VkIGluIGBmYWxzZWBcbiAqIChcInRydWUtc2l6aW5nXCIpLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcnxmYWxzZX0gd2lkdGggV2lkdGggdG8gYmUgc2V0LlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5zZXRXaWR0aCA9IGZ1bmN0aW9uIHNldFdpZHRoKHdpZHRoKSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG5cbiAgICB2YXIgY29udGVudFdyYXBwZXIgPSB0aGlzLl90YXJnZXQuY29udGVudDtcblxuICAgIGlmICh3aWR0aCA9PT0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmV4cGxpY2l0V2lkdGggPSB0cnVlO1xuICAgICAgICBpZiAoY29udGVudFdyYXBwZXIpIGNvbnRlbnRXcmFwcGVyLnN0eWxlLndpZHRoID0gJyc7XG4gICAgICAgIHdpZHRoID0gY29udGVudFdyYXBwZXIgPyBjb250ZW50V3JhcHBlci5vZmZzZXRXaWR0aCA6IDA7XG4gICAgICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LnN0eWxlLndpZHRoID0gd2lkdGggKyAncHgnO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmV4cGxpY2l0V2lkdGggPSBmYWxzZTtcbiAgICAgICAgaWYgKGNvbnRlbnRXcmFwcGVyKSBjb250ZW50V3JhcHBlci5zdHlsZS53aWR0aCA9IHdpZHRoICsgJ3B4JztcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuc3R5bGUud2lkdGggPSB3aWR0aCArICdweCc7XG4gICAgfVxuXG4gICAgdGhpcy5fdGFyZ2V0LnNpemVbMF0gPSB3aWR0aDtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgaGVpZ2h0IG9mIHRoZSBjdXJyZW50bHkgbG9hZGVkIHRhcmdldC5cbiAqIFJlbW92ZXMgYW55IGV4cGxpY2l0IHNpemluZyBjb25zdHJhaW50cyB3aGVuIHBhc3NlZCBpbiBgZmFsc2VgXG4gKiAoXCJ0cnVlLXNpemluZ1wiKS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ8ZmFsc2V9IGhlaWdodCBIZWlnaHQgdG8gYmUgc2V0LlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5zZXRIZWlnaHQgPSBmdW5jdGlvbiBzZXRIZWlnaHQoaGVpZ2h0KSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG5cbiAgICB2YXIgY29udGVudFdyYXBwZXIgPSB0aGlzLl90YXJnZXQuY29udGVudDtcblxuICAgIGlmIChoZWlnaHQgPT09IGZhbHNlKSB7XG4gICAgICAgIHRoaXMuX3RhcmdldC5leHBsaWNpdEhlaWdodCA9IHRydWU7XG4gICAgICAgIGlmIChjb250ZW50V3JhcHBlcikgY29udGVudFdyYXBwZXIuc3R5bGUuaGVpZ2h0ID0gJyc7XG4gICAgICAgIGhlaWdodCA9IGNvbnRlbnRXcmFwcGVyID8gY29udGVudFdyYXBwZXIub2Zmc2V0SGVpZ2h0IDogMDtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0ICsgJ3B4JztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX3RhcmdldC5leHBsaWNpdEhlaWdodCA9IGZhbHNlO1xuICAgICAgICBpZiAoY29udGVudFdyYXBwZXIpIGNvbnRlbnRXcmFwcGVyLnN0eWxlLmhlaWdodCA9IGhlaWdodCArICdweCc7XG4gICAgICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LnN0eWxlLmhlaWdodCA9IGhlaWdodCArICdweCc7XG4gICAgfVxuXG4gICAgdGhpcy5fdGFyZ2V0LnNpemVbMV0gPSBoZWlnaHQ7XG59O1xuXG4vKipcbiAqIFNldHMgYW4gYXR0cmlidXRlIG9uIHRoZSBjdXJyZW50bHkgbG9hZGVkIHRhcmdldC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgQXR0cmlidXRlIG5hbWUgKGUuZy4gaHJlZilcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSBBdHRyaWJ1dGUgdmFsdWUgKGUuZy4gaHR0cDovL2ZhbW91cy5vcmcpXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLnNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIHNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMuX2Fzc2VydFRhcmdldExvYWRlZCgpO1xuICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGBpbm5lckhUTUxgIGNvbnRlbnQgb2YgdGhlIGN1cnJlbnRseSBsb2FkZWQgdGFyZ2V0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29udGVudCBDb250ZW50IHRvIGJlIHNldCBhcyBgaW5uZXJIVE1MYFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5zZXRDb250ZW50ID0gZnVuY3Rpb24gc2V0Q29udGVudChjb250ZW50KSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG4gICAgdGhpcy5maW5kQ2hpbGRyZW4oKTtcblxuICAgIGlmICghdGhpcy5fdGFyZ2V0LmNvbnRlbnQpIHtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmNvbnRlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmNvbnRlbnQuY2xhc3NMaXN0LmFkZCgnZmFtb3VzLWRvbS1lbGVtZW50LWNvbnRlbnQnKTtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuaW5zZXJ0QmVmb3JlKFxuICAgICAgICAgICAgdGhpcy5fdGFyZ2V0LmNvbnRlbnQsXG4gICAgICAgICAgICB0aGlzLl90YXJnZXQuZWxlbWVudC5maXJzdENoaWxkXG4gICAgICAgICk7XG4gICAgfVxuICAgIHRoaXMuX3RhcmdldC5jb250ZW50LmlubmVySFRNTCA9IGNvbnRlbnQ7XG5cbiAgICB0aGlzLnNldFNpemUoXG4gICAgICAgIHRoaXMuX3RhcmdldC5leHBsaWNpdFdpZHRoID8gZmFsc2UgOiB0aGlzLl90YXJnZXQuc2l6ZVswXSxcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmV4cGxpY2l0SGVpZ2h0ID8gZmFsc2UgOiB0aGlzLl90YXJnZXQuc2l6ZVsxXVxuICAgICk7XG59O1xuXG5cbi8qKlxuICogU2V0cyB0aGUgcGFzc2VkIGluIHRyYW5zZm9ybSBtYXRyaXggKHdvcmxkIHNwYWNlKS4gSW52ZXJ0cyB0aGUgcGFyZW50J3Mgd29ybGRcbiAqIHRyYW5zZm9ybS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtGbG9hdDMyQXJyYXl9IHRyYW5zZm9ybSBUaGUgdHJhbnNmb3JtIGZvciB0aGUgbG9hZGVkIERPTSBFbGVtZW50IGluIHdvcmxkIHNwYWNlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLnNldE1hdHJpeCA9IGZ1bmN0aW9uIHNldE1hdHJpeCh0cmFuc2Zvcm0pIHtcbiAgICAvLyBUT0RPIERvbid0IG11bHRpcGx5IG1hdHJpY3MgaW4gdGhlIGZpcnN0IHBsYWNlLlxuICAgIHRoaXMuX2Fzc2VydFRhcmdldExvYWRlZCgpO1xuICAgIHRoaXMuZmluZFBhcmVudCgpO1xuICAgIHZhciB3b3JsZFRyYW5zZm9ybSA9IHRoaXMuX3RhcmdldC53b3JsZFRyYW5zZm9ybTtcbiAgICB2YXIgY2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgdmFyIGk7XG4gICAgdmFyIGxlbjtcblxuICAgIGlmICh0cmFuc2Zvcm0pXG4gICAgICAgIGZvciAoaSA9IDAsIGxlbiA9IDE2IDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICAgICAgY2hhbmdlZCA9IGNoYW5nZWQgPyBjaGFuZ2VkIDogd29ybGRUcmFuc2Zvcm1baV0gPT09IHRyYW5zZm9ybVtpXTtcbiAgICAgICAgICAgIHdvcmxkVHJhbnNmb3JtW2ldID0gdHJhbnNmb3JtW2ldO1xuICAgICAgICB9XG4gICAgZWxzZSBjaGFuZ2VkID0gdHJ1ZTtcblxuICAgIGlmIChjaGFuZ2VkKSB7XG4gICAgICAgIG1hdGguaW52ZXJ0KHRoaXMuX3RhcmdldC5pbnZlcnRlZFBhcmVudCwgdGhpcy5fcGFyZW50LndvcmxkVHJhbnNmb3JtKTtcbiAgICAgICAgbWF0aC5tdWx0aXBseSh0aGlzLl90YXJnZXQuZmluYWxUcmFuc2Zvcm0sIHRoaXMuX3RhcmdldC5pbnZlcnRlZFBhcmVudCwgd29ybGRUcmFuc2Zvcm0pO1xuXG4gICAgICAgIC8vIFRPRE86IHRoaXMgaXMgYSB0ZW1wb3JhcnkgZml4IGZvciBkcmF3IGNvbW1hbmRzXG4gICAgICAgIC8vIGNvbWluZyBpbiBvdXQgb2Ygb3JkZXJcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gdGhpcy5maW5kQ2hpbGRyZW4oW10pO1xuICAgICAgICB2YXIgcHJldmlvdXNQYXRoID0gdGhpcy5fcGF0aDtcbiAgICAgICAgdmFyIHByZXZpb3VzVGFyZ2V0ID0gdGhpcy5fdGFyZ2V0O1xuICAgICAgICBmb3IgKGkgPSAwLCBsZW4gPSBjaGlsZHJlbi5sZW5ndGggOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLl90YXJnZXQgPSBjaGlsZHJlbltpXTtcbiAgICAgICAgICAgIHRoaXMuX3BhdGggPSB0aGlzLl90YXJnZXQucGF0aDtcbiAgICAgICAgICAgIHRoaXMuc2V0TWF0cml4KCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcGF0aCA9IHByZXZpb3VzUGF0aDtcbiAgICAgICAgdGhpcy5fdGFyZ2V0ID0gcHJldmlvdXNUYXJnZXQ7XG4gICAgfVxuXG4gICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuc3R5bGVbVFJBTlNGT1JNXSA9IHRoaXMuX3N0cmluZ2lmeU1hdHJpeCh0aGlzLl90YXJnZXQuZmluYWxUcmFuc2Zvcm0pO1xufTtcblxuXG4vKipcbiAqIEFkZHMgYSBjbGFzcyB0byB0aGUgY2xhc3NMaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgY3VycmVudGx5IGxvYWRlZCB0YXJnZXQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBkb21DbGFzcyBDbGFzcyBuYW1lIHRvIGJlIGFkZGVkIHRvIHRoZSBjdXJyZW50IHRhcmdldC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuYWRkQ2xhc3MgPSBmdW5jdGlvbiBhZGRDbGFzcyhkb21DbGFzcykge1xuICAgIHRoaXMuX2Fzc2VydFRhcmdldExvYWRlZCgpO1xuICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LmNsYXNzTGlzdC5hZGQoZG9tQ2xhc3MpO1xufTtcblxuXG4vKipcbiAqIFJlbW92ZXMgYSBjbGFzcyBmcm9tIHRoZSBjbGFzc0xpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBjdXJyZW50bHkgbG9hZGVkXG4gKiB0YXJnZXQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBkb21DbGFzcyBDbGFzcyBuYW1lIHRvIGJlIHJlbW92ZWQgZnJvbSBjdXJyZW50bHkgbG9hZGVkIHRhcmdldC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUucmVtb3ZlQ2xhc3MgPSBmdW5jdGlvbiByZW1vdmVDbGFzcyhkb21DbGFzcykge1xuICAgIHRoaXMuX2Fzc2VydFRhcmdldExvYWRlZCgpO1xuICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoZG9tQ2xhc3MpO1xufTtcblxuXG4vKipcbiAqIFN0cmluZ2lmaWVzIHRoZSBwYXNzZWQgaW4gbWF0cml4IGZvciBzZXR0aW5nIHRoZSBgdHJhbnNmb3JtYCBwcm9wZXJ0eS5cbiAqXG4gKiBAbWV0aG9kICBfc3RyaW5naWZ5TWF0cml4XG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IG0gICAgTWF0cml4IGFzIGFuIGFycmF5IG9yIGFycmF5LWxpa2Ugb2JqZWN0LlxuICogQHJldHVybiB7U3RyaW5nfSAgICAgU3RyaW5naWZpZWQgbWF0cml4IGFzIGBtYXRyaXgzZGAtcHJvcGVydHkuXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5fc3RyaW5naWZ5TWF0cml4ID0gZnVuY3Rpb24gX3N0cmluZ2lmeU1hdHJpeChtKSB7XG4gICAgdmFyIHIgPSAnbWF0cml4M2QoJztcblxuICAgIHIgKz0gKG1bMF0gPCAwLjAwMDAwMSAmJiBtWzBdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzBdICsgJywnO1xuICAgIHIgKz0gKG1bMV0gPCAwLjAwMDAwMSAmJiBtWzFdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzFdICsgJywnO1xuICAgIHIgKz0gKG1bMl0gPCAwLjAwMDAwMSAmJiBtWzJdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzJdICsgJywnO1xuICAgIHIgKz0gKG1bM10gPCAwLjAwMDAwMSAmJiBtWzNdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzNdICsgJywnO1xuICAgIHIgKz0gKG1bNF0gPCAwLjAwMDAwMSAmJiBtWzRdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzRdICsgJywnO1xuICAgIHIgKz0gKG1bNV0gPCAwLjAwMDAwMSAmJiBtWzVdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzVdICsgJywnO1xuICAgIHIgKz0gKG1bNl0gPCAwLjAwMDAwMSAmJiBtWzZdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzZdICsgJywnO1xuICAgIHIgKz0gKG1bN10gPCAwLjAwMDAwMSAmJiBtWzddID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzddICsgJywnO1xuICAgIHIgKz0gKG1bOF0gPCAwLjAwMDAwMSAmJiBtWzhdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzhdICsgJywnO1xuICAgIHIgKz0gKG1bOV0gPCAwLjAwMDAwMSAmJiBtWzldID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzldICsgJywnO1xuICAgIHIgKz0gKG1bMTBdIDwgMC4wMDAwMDEgJiYgbVsxMF0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMTBdICsgJywnO1xuICAgIHIgKz0gKG1bMTFdIDwgMC4wMDAwMDEgJiYgbVsxMV0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMTFdICsgJywnO1xuICAgIHIgKz0gKG1bMTJdIDwgMC4wMDAwMDEgJiYgbVsxMl0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMTJdICsgJywnO1xuICAgIHIgKz0gKG1bMTNdIDwgMC4wMDAwMDEgJiYgbVsxM10gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMTNdICsgJywnO1xuICAgIHIgKz0gKG1bMTRdIDwgMC4wMDAwMDEgJiYgbVsxNF0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMTRdICsgJywnO1xuXG4gICAgciArPSBtWzE1XSArICcpJztcbiAgICByZXR1cm4gcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRE9NUmVuZGVyZXI7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICogXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICogXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKiBcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqIFxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vLyBUcmFuc2Zvcm0gaWRlbnRpdHkgbWF0cml4LiBcbnZhciBpZGVudCA9IFtcbiAgICAxLCAwLCAwLCAwLFxuICAgIDAsIDEsIDAsIDAsXG4gICAgMCwgMCwgMSwgMCxcbiAgICAwLCAwLCAwLCAxXG5dO1xuXG4vKipcbiAqIEVsZW1lbnRDYWNoZSBpcyBiZWluZyB1c2VkIGZvciBrZWVwaW5nIHRyYWNrIG9mIGFuIGVsZW1lbnQncyBET00gRWxlbWVudCxcbiAqIHBhdGgsIHdvcmxkIHRyYW5zZm9ybSwgaW52ZXJ0ZWQgcGFyZW50LCBmaW5hbCB0cmFuc2Zvcm0gKGFzIGJlaW5nIHVzZWQgZm9yXG4gKiBzZXR0aW5nIHRoZSBhY3R1YWwgYHRyYW5zZm9ybWAtcHJvcGVydHkpIGFuZCBwb3N0IHJlbmRlciBzaXplIChmaW5hbCBzaXplIGFzXG4gKiBiZWluZyByZW5kZXJlZCB0byB0aGUgRE9NKS5cbiAqIFxuICogQGNsYXNzIEVsZW1lbnRDYWNoZVxuICogIFxuICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50IERPTUVsZW1lbnRcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBmb3IgdW5pcXVlbHkgaWRlbnRpZnlpbmcgdGhlIGxvY2F0aW9uIGluIHRoZSBzY2VuZSBncmFwaC5cbiAqLyBcbmZ1bmN0aW9uIEVsZW1lbnRDYWNoZSAoZWxlbWVudCwgcGF0aCkge1xuICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICB0aGlzLmNvbnRlbnQgPSBudWxsO1xuICAgIHRoaXMuc2l6ZSA9IG5ldyBJbnQxNkFycmF5KDMpO1xuICAgIHRoaXMuZXhwbGljaXRIZWlnaHQgPSBmYWxzZTtcbiAgICB0aGlzLmV4cGxpY2l0V2lkdGggPSBmYWxzZTtcbiAgICB0aGlzLndvcmxkVHJhbnNmb3JtID0gbmV3IEZsb2F0MzJBcnJheShpZGVudCk7XG4gICAgdGhpcy5pbnZlcnRlZFBhcmVudCA9IG5ldyBGbG9hdDMyQXJyYXkoaWRlbnQpO1xuICAgIHRoaXMuZmluYWxUcmFuc2Zvcm0gPSBuZXcgRmxvYXQzMkFycmF5KGlkZW50KTtcbiAgICB0aGlzLnBvc3RSZW5kZXJTaXplID0gbmV3IEZsb2F0MzJBcnJheSgyKTtcbiAgICB0aGlzLmxpc3RlbmVycyA9IHt9O1xuICAgIHRoaXMucHJldmVudERlZmF1bHQgPSB7fTtcbiAgICB0aGlzLnN1YnNjcmliZSA9IHt9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVsZW1lbnRDYWNoZTtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBBIG1ldGhvZCBmb3IgaW52ZXJ0aW5nIGEgdHJhbnNmb3JtIG1hdHJpeFxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBvdXQgYXJyYXkgdG8gc3RvcmUgdGhlIHJldHVybiBvZiB0aGUgaW52ZXJzaW9uXG4gKiBAcGFyYW0ge0FycmF5fSBhIHRyYW5zZm9ybSBtYXRyaXggdG8gaW52ZXJzZVxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBvdXRcbiAqICAgb3V0cHV0IGFycmF5IHRoYXQgaXMgc3RvcmluZyB0aGUgdHJhbnNmb3JtIG1hdHJpeFxuICovXG5mdW5jdGlvbiBpbnZlcnQgKG91dCwgYSkge1xuICAgIHZhciBhMDAgPSBhWzBdLCBhMDEgPSBhWzFdLCBhMDIgPSBhWzJdLCBhMDMgPSBhWzNdLFxuICAgICAgICBhMTAgPSBhWzRdLCBhMTEgPSBhWzVdLCBhMTIgPSBhWzZdLCBhMTMgPSBhWzddLFxuICAgICAgICBhMjAgPSBhWzhdLCBhMjEgPSBhWzldLCBhMjIgPSBhWzEwXSwgYTIzID0gYVsxMV0sXG4gICAgICAgIGEzMCA9IGFbMTJdLCBhMzEgPSBhWzEzXSwgYTMyID0gYVsxNF0sIGEzMyA9IGFbMTVdLFxuXG4gICAgICAgIGIwMCA9IGEwMCAqIGExMSAtIGEwMSAqIGExMCxcbiAgICAgICAgYjAxID0gYTAwICogYTEyIC0gYTAyICogYTEwLFxuICAgICAgICBiMDIgPSBhMDAgKiBhMTMgLSBhMDMgKiBhMTAsXG4gICAgICAgIGIwMyA9IGEwMSAqIGExMiAtIGEwMiAqIGExMSxcbiAgICAgICAgYjA0ID0gYTAxICogYTEzIC0gYTAzICogYTExLFxuICAgICAgICBiMDUgPSBhMDIgKiBhMTMgLSBhMDMgKiBhMTIsXG4gICAgICAgIGIwNiA9IGEyMCAqIGEzMSAtIGEyMSAqIGEzMCxcbiAgICAgICAgYjA3ID0gYTIwICogYTMyIC0gYTIyICogYTMwLFxuICAgICAgICBiMDggPSBhMjAgKiBhMzMgLSBhMjMgKiBhMzAsXG4gICAgICAgIGIwOSA9IGEyMSAqIGEzMiAtIGEyMiAqIGEzMSxcbiAgICAgICAgYjEwID0gYTIxICogYTMzIC0gYTIzICogYTMxLFxuICAgICAgICBiMTEgPSBhMjIgKiBhMzMgLSBhMjMgKiBhMzIsXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBkZXRlcm1pbmFudFxuICAgICAgICBkZXQgPSBiMDAgKiBiMTEgLSBiMDEgKiBiMTAgKyBiMDIgKiBiMDkgKyBiMDMgKiBiMDggLSBiMDQgKiBiMDcgKyBiMDUgKiBiMDY7XG5cbiAgICBpZiAoIWRldCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgZGV0ID0gMS4wIC8gZGV0O1xuXG4gICAgb3V0WzBdID0gKGExMSAqIGIxMSAtIGExMiAqIGIxMCArIGExMyAqIGIwOSkgKiBkZXQ7XG4gICAgb3V0WzFdID0gKGEwMiAqIGIxMCAtIGEwMSAqIGIxMSAtIGEwMyAqIGIwOSkgKiBkZXQ7XG4gICAgb3V0WzJdID0gKGEzMSAqIGIwNSAtIGEzMiAqIGIwNCArIGEzMyAqIGIwMykgKiBkZXQ7XG4gICAgb3V0WzNdID0gKGEyMiAqIGIwNCAtIGEyMSAqIGIwNSAtIGEyMyAqIGIwMykgKiBkZXQ7XG4gICAgb3V0WzRdID0gKGExMiAqIGIwOCAtIGExMCAqIGIxMSAtIGExMyAqIGIwNykgKiBkZXQ7XG4gICAgb3V0WzVdID0gKGEwMCAqIGIxMSAtIGEwMiAqIGIwOCArIGEwMyAqIGIwNykgKiBkZXQ7XG4gICAgb3V0WzZdID0gKGEzMiAqIGIwMiAtIGEzMCAqIGIwNSAtIGEzMyAqIGIwMSkgKiBkZXQ7XG4gICAgb3V0WzddID0gKGEyMCAqIGIwNSAtIGEyMiAqIGIwMiArIGEyMyAqIGIwMSkgKiBkZXQ7XG4gICAgb3V0WzhdID0gKGExMCAqIGIxMCAtIGExMSAqIGIwOCArIGExMyAqIGIwNikgKiBkZXQ7XG4gICAgb3V0WzldID0gKGEwMSAqIGIwOCAtIGEwMCAqIGIxMCAtIGEwMyAqIGIwNikgKiBkZXQ7XG4gICAgb3V0WzEwXSA9IChhMzAgKiBiMDQgLSBhMzEgKiBiMDIgKyBhMzMgKiBiMDApICogZGV0O1xuICAgIG91dFsxMV0gPSAoYTIxICogYjAyIC0gYTIwICogYjA0IC0gYTIzICogYjAwKSAqIGRldDtcbiAgICBvdXRbMTJdID0gKGExMSAqIGIwNyAtIGExMCAqIGIwOSAtIGExMiAqIGIwNikgKiBkZXQ7XG4gICAgb3V0WzEzXSA9IChhMDAgKiBiMDkgLSBhMDEgKiBiMDcgKyBhMDIgKiBiMDYpICogZGV0O1xuICAgIG91dFsxNF0gPSAoYTMxICogYjAxIC0gYTMwICogYjAzIC0gYTMyICogYjAwKSAqIGRldDtcbiAgICBvdXRbMTVdID0gKGEyMCAqIGIwMyAtIGEyMSAqIGIwMSArIGEyMiAqIGIwMCkgKiBkZXQ7XG5cbiAgICByZXR1cm4gb3V0O1xufVxuXG4vKipcbiAqIEEgbWV0aG9kIGZvciBtdWx0aXBseWluZyB0d28gbWF0cmljaWVzXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IG91dCBhcnJheSB0byBzdG9yZSB0aGUgcmV0dXJuIG9mIHRoZSBtdWx0aXBsaWNhdGlvblxuICogQHBhcmFtIHtBcnJheX0gYSB0cmFuc2Zvcm0gbWF0cml4IHRvIG11bHRpcGx5XG4gKiBAcGFyYW0ge0FycmF5fSBiIHRyYW5zZm9ybSBtYXRyaXggdG8gbXVsdGlwbHlcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gb3V0XG4gKiAgIG91dHB1dCBhcnJheSB0aGF0IGlzIHN0b3JpbmcgdGhlIHRyYW5zZm9ybSBtYXRyaXhcbiAqL1xuZnVuY3Rpb24gbXVsdGlwbHkgKG91dCwgYSwgYikge1xuICAgIHZhciBhMDAgPSBhWzBdLCBhMDEgPSBhWzFdLCBhMDIgPSBhWzJdLCBhMDMgPSBhWzNdLFxuICAgICAgICBhMTAgPSBhWzRdLCBhMTEgPSBhWzVdLCBhMTIgPSBhWzZdLCBhMTMgPSBhWzddLFxuICAgICAgICBhMjAgPSBhWzhdLCBhMjEgPSBhWzldLCBhMjIgPSBhWzEwXSwgYTIzID0gYVsxMV0sXG4gICAgICAgIGEzMCA9IGFbMTJdLCBhMzEgPSBhWzEzXSwgYTMyID0gYVsxNF0sIGEzMyA9IGFbMTVdLFxuXG4gICAgICAgIGIwID0gYlswXSwgYjEgPSBiWzFdLCBiMiA9IGJbMl0sIGIzID0gYlszXSxcbiAgICAgICAgYjQgPSBiWzRdLCBiNSA9IGJbNV0sIGI2ID0gYls2XSwgYjcgPSBiWzddLFxuICAgICAgICBiOCA9IGJbOF0sIGI5ID0gYls5XSwgYjEwID0gYlsxMF0sIGIxMSA9IGJbMTFdLFxuICAgICAgICBiMTIgPSBiWzEyXSwgYjEzID0gYlsxM10sIGIxNCA9IGJbMTRdLCBiMTUgPSBiWzE1XTtcblxuICAgIHZhciBjaGFuZ2VkID0gZmFsc2U7XG4gICAgdmFyIG91dDAsIG91dDEsIG91dDIsIG91dDM7XG5cbiAgICBvdXQwID0gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwO1xuICAgIG91dDEgPSBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzE7XG4gICAgb3V0MiA9IGIwKmEwMiArIGIxKmExMiArIGIyKmEyMiArIGIzKmEzMjtcbiAgICBvdXQzID0gYjAqYTAzICsgYjEqYTEzICsgYjIqYTIzICsgYjMqYTMzO1xuXG4gICAgY2hhbmdlZCA9IGNoYW5nZWQgP1xuICAgICAgICAgICAgICBjaGFuZ2VkIDogb3V0MCA9PT0gb3V0WzBdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQxID09PSBvdXRbMV0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDIgPT09IG91dFsyXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MyA9PT0gb3V0WzNdO1xuXG4gICAgb3V0WzBdID0gb3V0MDtcbiAgICBvdXRbMV0gPSBvdXQxO1xuICAgIG91dFsyXSA9IG91dDI7XG4gICAgb3V0WzNdID0gb3V0MztcblxuICAgIGIwID0gYjQ7IGIxID0gYjU7IGIyID0gYjY7IGIzID0gYjc7XG4gICAgb3V0MCA9IGIwKmEwMCArIGIxKmExMCArIGIyKmEyMCArIGIzKmEzMDtcbiAgICBvdXQxID0gYjAqYTAxICsgYjEqYTExICsgYjIqYTIxICsgYjMqYTMxO1xuICAgIG91dDIgPSBiMCphMDIgKyBiMSphMTIgKyBiMiphMjIgKyBiMyphMzI7XG4gICAgb3V0MyA9IGIwKmEwMyArIGIxKmExMyArIGIyKmEyMyArIGIzKmEzMztcblxuICAgIGNoYW5nZWQgPSBjaGFuZ2VkID9cbiAgICAgICAgICAgICAgY2hhbmdlZCA6IG91dDAgPT09IG91dFs0XSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MSA9PT0gb3V0WzVdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQyID09PSBvdXRbNl0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDMgPT09IG91dFs3XTtcblxuICAgIG91dFs0XSA9IG91dDA7XG4gICAgb3V0WzVdID0gb3V0MTtcbiAgICBvdXRbNl0gPSBvdXQyO1xuICAgIG91dFs3XSA9IG91dDM7XG5cbiAgICBiMCA9IGI4OyBiMSA9IGI5OyBiMiA9IGIxMDsgYjMgPSBiMTE7XG4gICAgb3V0MCA9IGIwKmEwMCArIGIxKmExMCArIGIyKmEyMCArIGIzKmEzMDtcbiAgICBvdXQxID0gYjAqYTAxICsgYjEqYTExICsgYjIqYTIxICsgYjMqYTMxO1xuICAgIG91dDIgPSBiMCphMDIgKyBiMSphMTIgKyBiMiphMjIgKyBiMyphMzI7XG4gICAgb3V0MyA9IGIwKmEwMyArIGIxKmExMyArIGIyKmEyMyArIGIzKmEzMztcblxuICAgIGNoYW5nZWQgPSBjaGFuZ2VkID9cbiAgICAgICAgICAgICAgY2hhbmdlZCA6IG91dDAgPT09IG91dFs4XSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MSA9PT0gb3V0WzldIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQyID09PSBvdXRbMTBdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQzID09PSBvdXRbMTFdO1xuXG4gICAgb3V0WzhdID0gb3V0MDtcbiAgICBvdXRbOV0gPSBvdXQxO1xuICAgIG91dFsxMF0gPSBvdXQyO1xuICAgIG91dFsxMV0gPSBvdXQzO1xuXG4gICAgYjAgPSBiMTI7IGIxID0gYjEzOyBiMiA9IGIxNDsgYjMgPSBiMTU7XG4gICAgb3V0MCA9IGIwKmEwMCArIGIxKmExMCArIGIyKmEyMCArIGIzKmEzMDtcbiAgICBvdXQxID0gYjAqYTAxICsgYjEqYTExICsgYjIqYTIxICsgYjMqYTMxO1xuICAgIG91dDIgPSBiMCphMDIgKyBiMSphMTIgKyBiMiphMjIgKyBiMyphMzI7XG4gICAgb3V0MyA9IGIwKmEwMyArIGIxKmExMyArIGIyKmEyMyArIGIzKmEzMztcblxuICAgIGNoYW5nZWQgPSBjaGFuZ2VkID9cbiAgICAgICAgICAgICAgY2hhbmdlZCA6IG91dDAgPT09IG91dFsxMl0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDEgPT09IG91dFsxM10gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDIgPT09IG91dFsxNF0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDMgPT09IG91dFsxNV07XG5cbiAgICBvdXRbMTJdID0gb3V0MDtcbiAgICBvdXRbMTNdID0gb3V0MTtcbiAgICBvdXRbMTRdID0gb3V0MjtcbiAgICBvdXRbMTVdID0gb3V0MztcblxuICAgIHJldHVybiBvdXQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIG11bHRpcGx5OiBtdWx0aXBseSxcbiAgICBpbnZlcnQ6IGludmVydFxufTtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFVJRXZlbnQgPSByZXF1aXJlKCcuL1VJRXZlbnQnKTtcblxuLyoqXG4gKiBTZWUgW1VJIEV2ZW50cyAoZm9ybWVybHkgRE9NIExldmVsIDMgRXZlbnRzKV0oaHR0cDovL3d3dy53My5vcmcvVFIvMjAxNS9XRC11aWV2ZW50cy0yMDE1MDQyOC8jZXZlbnRzLWNvbXBvc2l0aW9uZXZlbnRzKS5cbiAqXG4gKiBAY2xhc3MgQ29tcG9zaXRpb25FdmVudFxuICogQGF1Z21lbnRzIFVJRXZlbnRcbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldiBUaGUgbmF0aXZlIERPTSBldmVudC5cbiAqL1xuZnVuY3Rpb24gQ29tcG9zaXRpb25FdmVudChldikge1xuICAgIC8vIFtDb25zdHJ1Y3RvcihET01TdHJpbmcgdHlwZUFyZywgb3B0aW9uYWwgQ29tcG9zaXRpb25FdmVudEluaXQgY29tcG9zaXRpb25FdmVudEluaXREaWN0KV1cbiAgICAvLyBpbnRlcmZhY2UgQ29tcG9zaXRpb25FdmVudCA6IFVJRXZlbnQge1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgRE9NU3RyaW5nIGRhdGE7XG4gICAgLy8gfTtcblxuICAgIFVJRXZlbnQuY2FsbCh0aGlzLCBldik7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBDb21wb3NpdGlvbkV2ZW50I2RhdGFcbiAgICAgKiBAdHlwZSBTdHJpbmdcbiAgICAgKi9cbiAgICB0aGlzLmRhdGEgPSBldi5kYXRhO1xufVxuXG5Db21wb3NpdGlvbkV2ZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoVUlFdmVudC5wcm90b3R5cGUpO1xuQ29tcG9zaXRpb25FdmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb21wb3NpdGlvbkV2ZW50O1xuXG4vKipcbiAqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqL1xuQ29tcG9zaXRpb25FdmVudC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdDb21wb3NpdGlvbkV2ZW50Jztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9zaXRpb25FdmVudDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBUaGUgRXZlbnQgY2xhc3MgaXMgYmVpbmcgdXNlZCBpbiBvcmRlciB0byBub3JtYWxpemUgbmF0aXZlIERPTSBldmVudHMuXG4gKiBFdmVudHMgbmVlZCB0byBiZSBub3JtYWxpemVkIGluIG9yZGVyIHRvIGJlIHNlcmlhbGl6ZWQgdGhyb3VnaCB0aGUgc3RydWN0dXJlZFxuICogY2xvbmluZyBhbGdvcml0aG0gdXNlZCBieSB0aGUgYHBvc3RNZXNzYWdlYCBtZXRob2QgKFdlYiBXb3JrZXJzKS5cbiAqXG4gKiBXcmFwcGluZyBET00gZXZlbnRzIGFsc28gaGFzIHRoZSBhZHZhbnRhZ2Ugb2YgcHJvdmlkaW5nIGEgY29uc2lzdGVudFxuICogaW50ZXJmYWNlIGZvciBpbnRlcmFjdGluZyB3aXRoIERPTSBldmVudHMgYWNyb3NzIGJyb3dzZXJzIGJ5IGNvcHlpbmcgb3ZlciBhXG4gKiBzdWJzZXQgb2YgdGhlIGV4cG9zZWQgcHJvcGVydGllcyB0aGF0IGlzIGd1YXJhbnRlZWQgdG8gYmUgY29uc2lzdGVudCBhY3Jvc3NcbiAqIGJyb3dzZXJzLlxuICpcbiAqIFNlZSBbVUkgRXZlbnRzIChmb3JtZXJseSBET00gTGV2ZWwgMyBFdmVudHMpXShodHRwOi8vd3d3LnczLm9yZy9UUi8yMDE1L1dELXVpZXZlbnRzLTIwMTUwNDI4LyNpbnRlcmZhY2UtRXZlbnQpLlxuICpcbiAqIEBjbGFzcyBFdmVudFxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2IFRoZSBuYXRpdmUgRE9NIGV2ZW50LlxuICovXG5mdW5jdGlvbiBFdmVudChldikge1xuICAgIC8vIFtDb25zdHJ1Y3RvcihET01TdHJpbmcgdHlwZSwgb3B0aW9uYWwgRXZlbnRJbml0IGV2ZW50SW5pdERpY3QpLFxuICAgIC8vICBFeHBvc2VkPVdpbmRvdyxXb3JrZXJdXG4gICAgLy8gaW50ZXJmYWNlIEV2ZW50IHtcbiAgICAvLyAgIHJlYWRvbmx5IGF0dHJpYnV0ZSBET01TdHJpbmcgdHlwZTtcbiAgICAvLyAgIHJlYWRvbmx5IGF0dHJpYnV0ZSBFdmVudFRhcmdldD8gdGFyZ2V0O1xuICAgIC8vICAgcmVhZG9ubHkgYXR0cmlidXRlIEV2ZW50VGFyZ2V0PyBjdXJyZW50VGFyZ2V0O1xuXG4gICAgLy8gICBjb25zdCB1bnNpZ25lZCBzaG9ydCBOT05FID0gMDtcbiAgICAvLyAgIGNvbnN0IHVuc2lnbmVkIHNob3J0IENBUFRVUklOR19QSEFTRSA9IDE7XG4gICAgLy8gICBjb25zdCB1bnNpZ25lZCBzaG9ydCBBVF9UQVJHRVQgPSAyO1xuICAgIC8vICAgY29uc3QgdW5zaWduZWQgc2hvcnQgQlVCQkxJTkdfUEhBU0UgPSAzO1xuICAgIC8vICAgcmVhZG9ubHkgYXR0cmlidXRlIHVuc2lnbmVkIHNob3J0IGV2ZW50UGhhc2U7XG5cbiAgICAvLyAgIHZvaWQgc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgLy8gICB2b2lkIHN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXG4gICAgLy8gICByZWFkb25seSBhdHRyaWJ1dGUgYm9vbGVhbiBidWJibGVzO1xuICAgIC8vICAgcmVhZG9ubHkgYXR0cmlidXRlIGJvb2xlYW4gY2FuY2VsYWJsZTtcbiAgICAvLyAgIHZvaWQgcHJldmVudERlZmF1bHQoKTtcbiAgICAvLyAgIHJlYWRvbmx5IGF0dHJpYnV0ZSBib29sZWFuIGRlZmF1bHRQcmV2ZW50ZWQ7XG5cbiAgICAvLyAgIFtVbmZvcmdlYWJsZV0gcmVhZG9ubHkgYXR0cmlidXRlIGJvb2xlYW4gaXNUcnVzdGVkO1xuICAgIC8vICAgcmVhZG9ubHkgYXR0cmlidXRlIERPTVRpbWVTdGFtcCB0aW1lU3RhbXA7XG5cbiAgICAvLyAgIHZvaWQgaW5pdEV2ZW50KERPTVN0cmluZyB0eXBlLCBib29sZWFuIGJ1YmJsZXMsIGJvb2xlYW4gY2FuY2VsYWJsZSk7XG4gICAgLy8gfTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEV2ZW50I3R5cGVcbiAgICAgKiBAdHlwZSBTdHJpbmdcbiAgICAgKi9cbiAgICB0aGlzLnR5cGUgPSBldi50eXBlO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgRXZlbnQjZGVmYXVsdFByZXZlbnRlZFxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLmRlZmF1bHRQcmV2ZW50ZWQgPSBldi5kZWZhdWx0UHJldmVudGVkO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgRXZlbnQjdGltZVN0YW1wXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy50aW1lU3RhbXAgPSBldi50aW1lU3RhbXA7XG5cblxuICAgIC8qKlxuICAgICAqIFVzZWQgZm9yIGV4cG9zaW5nIHRoZSBjdXJyZW50IHRhcmdldCdzIHZhbHVlLlxuICAgICAqXG4gICAgICogQG5hbWUgRXZlbnQjdmFsdWVcbiAgICAgKiBAdHlwZSBTdHJpbmdcbiAgICAgKi9cbiAgICB2YXIgdGFyZ2V0Q29uc3RydWN0b3IgPSBldi50YXJnZXQuY29uc3RydWN0b3I7XG4gICAgLy8gVE9ETyBTdXBwb3J0IEhUTUxLZXlnZW5FbGVtZW50XG4gICAgaWYgKFxuICAgICAgICB0YXJnZXRDb25zdHJ1Y3RvciA9PT0gSFRNTElucHV0RWxlbWVudCB8fFxuICAgICAgICB0YXJnZXRDb25zdHJ1Y3RvciA9PT0gSFRNTFRleHRBcmVhRWxlbWVudCB8fFxuICAgICAgICB0YXJnZXRDb25zdHJ1Y3RvciA9PT0gSFRNTFNlbGVjdEVsZW1lbnRcbiAgICApIHtcbiAgICAgICAgdGhpcy52YWx1ZSA9IGV2LnRhcmdldC52YWx1ZTtcbiAgICB9XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICovXG5FdmVudC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdFdmVudCc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9zaXRpb25FdmVudCA9IHJlcXVpcmUoJy4vQ29tcG9zaXRpb25FdmVudCcpO1xudmFyIEV2ZW50ID0gcmVxdWlyZSgnLi9FdmVudCcpO1xudmFyIEZvY3VzRXZlbnQgPSByZXF1aXJlKCcuL0ZvY3VzRXZlbnQnKTtcbnZhciBJbnB1dEV2ZW50ID0gcmVxdWlyZSgnLi9JbnB1dEV2ZW50Jyk7XG52YXIgS2V5Ym9hcmRFdmVudCA9IHJlcXVpcmUoJy4vS2V5Ym9hcmRFdmVudCcpO1xudmFyIE1vdXNlRXZlbnQgPSByZXF1aXJlKCcuL01vdXNlRXZlbnQnKTtcbnZhciBUb3VjaEV2ZW50ID0gcmVxdWlyZSgnLi9Ub3VjaEV2ZW50Jyk7XG52YXIgVUlFdmVudCA9IHJlcXVpcmUoJy4vVUlFdmVudCcpO1xudmFyIFdoZWVsRXZlbnQgPSByZXF1aXJlKCcuL1doZWVsRXZlbnQnKTtcblxuLyoqXG4gKiBBIG1hcHBpbmcgb2YgRE9NIGV2ZW50cyB0byB0aGUgY29ycmVzcG9uZGluZyBoYW5kbGVyc1xuICpcbiAqIEBuYW1lIEV2ZW50TWFwXG4gKiBAdHlwZSBPYmplY3RcbiAqL1xudmFyIEV2ZW50TWFwID0ge1xuICAgIGNoYW5nZSAgICAgICAgICAgICAgICAgICAgICAgICA6IFtFdmVudCwgdHJ1ZV0sXG4gICAgc3VibWl0ICAgICAgICAgICAgICAgICAgICAgICAgIDogW0V2ZW50LCB0cnVlXSxcblxuICAgIC8vIFVJIEV2ZW50cyAoaHR0cDovL3d3dy53My5vcmcvVFIvdWlldmVudHMvKVxuICAgIGFib3J0ICAgICAgICAgICAgICAgICAgICAgICAgICA6IFtFdmVudCwgZmFsc2VdLFxuICAgIGJlZm9yZWlucHV0ICAgICAgICAgICAgICAgICAgICA6IFtJbnB1dEV2ZW50LCB0cnVlXSxcbiAgICBibHVyICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBbRm9jdXNFdmVudCwgZmFsc2VdLFxuICAgIGNsaWNrICAgICAgICAgICAgICAgICAgICAgICAgICA6IFtNb3VzZUV2ZW50LCB0cnVlXSxcbiAgICBjb21wb3NpdGlvbmVuZCAgICAgICAgICAgICAgICAgOiBbQ29tcG9zaXRpb25FdmVudCwgdHJ1ZV0sXG4gICAgY29tcG9zaXRpb25zdGFydCAgICAgICAgICAgICAgIDogW0NvbXBvc2l0aW9uRXZlbnQsIHRydWVdLFxuICAgIGNvbXBvc2l0aW9udXBkYXRlICAgICAgICAgICAgICA6IFtDb21wb3NpdGlvbkV2ZW50LCB0cnVlXSxcbiAgICBkYmxjbGljayAgICAgICAgICAgICAgICAgICAgICAgOiBbTW91c2VFdmVudCwgdHJ1ZV0sXG4gICAgZm9jdXMgICAgICAgICAgICAgICAgICAgICAgICAgIDogW0ZvY3VzRXZlbnQsIGZhbHNlXSxcbiAgICBmb2N1c2luICAgICAgICAgICAgICAgICAgICAgICAgOiBbRm9jdXNFdmVudCwgdHJ1ZV0sXG4gICAgZm9jdXNvdXQgICAgICAgICAgICAgICAgICAgICAgIDogW0ZvY3VzRXZlbnQsIHRydWVdLFxuICAgIGlucHV0ICAgICAgICAgICAgICAgICAgICAgICAgICA6IFtJbnB1dEV2ZW50LCB0cnVlXSxcbiAgICBrZXlkb3duICAgICAgICAgICAgICAgICAgICAgICAgOiBbS2V5Ym9hcmRFdmVudCwgdHJ1ZV0sXG4gICAga2V5dXAgICAgICAgICAgICAgICAgICAgICAgICAgIDogW0tleWJvYXJkRXZlbnQsIHRydWVdLFxuICAgIGxvYWQgICAgICAgICAgICAgICAgICAgICAgICAgICA6IFtFdmVudCwgZmFsc2VdLFxuICAgIG1vdXNlZG93biAgICAgICAgICAgICAgICAgICAgICA6IFtNb3VzZUV2ZW50LCB0cnVlXSxcbiAgICBtb3VzZWVudGVyICAgICAgICAgICAgICAgICAgICAgOiBbTW91c2VFdmVudCwgZmFsc2VdLFxuICAgIG1vdXNlbGVhdmUgICAgICAgICAgICAgICAgICAgICA6IFtNb3VzZUV2ZW50LCBmYWxzZV0sXG5cbiAgICAvLyBidWJibGVzLCBidXQgd2lsbCBiZSB0cmlnZ2VyZWQgdmVyeSBmcmVxdWVudGx5XG4gICAgbW91c2Vtb3ZlICAgICAgICAgICAgICAgICAgICAgIDogW01vdXNlRXZlbnQsIGZhbHNlXSxcblxuICAgIG1vdXNlb3V0ICAgICAgICAgICAgICAgICAgICAgICA6IFtNb3VzZUV2ZW50LCB0cnVlXSxcbiAgICBtb3VzZW92ZXIgICAgICAgICAgICAgICAgICAgICAgOiBbTW91c2VFdmVudCwgdHJ1ZV0sXG4gICAgbW91c2V1cCAgICAgICAgICAgICAgICAgICAgICAgIDogW01vdXNlRXZlbnQsIHRydWVdLFxuICAgIHJlc2l6ZSAgICAgICAgICAgICAgICAgICAgICAgICA6IFtVSUV2ZW50LCBmYWxzZV0sXG5cbiAgICAvLyBtaWdodCBidWJibGVcbiAgICBzY3JvbGwgICAgICAgICAgICAgICAgICAgICAgICAgOiBbVUlFdmVudCwgZmFsc2VdLFxuXG4gICAgc2VsZWN0ICAgICAgICAgICAgICAgICAgICAgICAgIDogW0V2ZW50LCB0cnVlXSxcbiAgICB1bmxvYWQgICAgICAgICAgICAgICAgICAgICAgICAgOiBbRXZlbnQsIGZhbHNlXSxcbiAgICB3aGVlbCAgICAgICAgICAgICAgICAgICAgICAgICAgOiBbV2hlZWxFdmVudCwgdHJ1ZV0sXG5cbiAgICAvLyBUb3VjaCBFdmVudHMgRXh0ZW5zaW9uIChodHRwOi8vd3d3LnczLm9yZy9UUi90b3VjaC1ldmVudHMtZXh0ZW5zaW9ucy8pXG4gICAgdG91Y2hjYW5jZWwgICAgICAgICAgICAgICAgICAgIDogW1RvdWNoRXZlbnQsIHRydWVdLFxuICAgIHRvdWNoZW5kICAgICAgICAgICAgICAgICAgICAgICA6IFtUb3VjaEV2ZW50LCB0cnVlXSxcbiAgICB0b3VjaG1vdmUgICAgICAgICAgICAgICAgICAgICAgOiBbVG91Y2hFdmVudCwgdHJ1ZV0sXG4gICAgdG91Y2hzdGFydCAgICAgICAgICAgICAgICAgICAgIDogW1RvdWNoRXZlbnQsIHRydWVdXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50TWFwO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVUlFdmVudCA9IHJlcXVpcmUoJy4vVUlFdmVudCcpO1xuXG4vKipcbiAqIFNlZSBbVUkgRXZlbnRzIChmb3JtZXJseSBET00gTGV2ZWwgMyBFdmVudHMpXShodHRwOi8vd3d3LnczLm9yZy9UUi8yMDE1L1dELXVpZXZlbnRzLTIwMTUwNDI4LyNldmVudHMtZm9jdXNldmVudCkuXG4gKlxuICogQGNsYXNzIEZvY3VzRXZlbnRcbiAqIEBhdWdtZW50cyBVSUV2ZW50XG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXYgVGhlIG5hdGl2ZSBET00gZXZlbnQuXG4gKi9cbmZ1bmN0aW9uIEZvY3VzRXZlbnQoZXYpIHtcbiAgICAvLyBbQ29uc3RydWN0b3IoRE9NU3RyaW5nIHR5cGVBcmcsIG9wdGlvbmFsIEZvY3VzRXZlbnRJbml0IGZvY3VzRXZlbnRJbml0RGljdCldXG4gICAgLy8gaW50ZXJmYWNlIEZvY3VzRXZlbnQgOiBVSUV2ZW50IHtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIEV2ZW50VGFyZ2V0PyByZWxhdGVkVGFyZ2V0O1xuICAgIC8vIH07XG5cbiAgICBVSUV2ZW50LmNhbGwodGhpcywgZXYpO1xufVxuXG5Gb2N1c0V2ZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoVUlFdmVudC5wcm90b3R5cGUpO1xuRm9jdXNFdmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBGb2N1c0V2ZW50O1xuXG4vKipcbiAqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqL1xuRm9jdXNFdmVudC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdGb2N1c0V2ZW50Jztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRm9jdXNFdmVudDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFVJRXZlbnQgPSByZXF1aXJlKCcuL1VJRXZlbnQnKTtcblxuLyoqXG4gKiBTZWUgW0lucHV0IEV2ZW50c10oaHR0cDovL3czYy5naXRodWIuaW8vZWRpdGluZy1leHBsYWluZXIvaW5wdXQtZXZlbnRzLmh0bWwjaWRsLWRlZi1JbnB1dEV2ZW50KS5cbiAqXG4gKiBAY2xhc3MgSW5wdXRFdmVudFxuICogQGF1Z21lbnRzIFVJRXZlbnRcbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldiBUaGUgbmF0aXZlIERPTSBldmVudC5cbiAqL1xuZnVuY3Rpb24gSW5wdXRFdmVudChldikge1xuICAgIC8vIFtDb25zdHJ1Y3RvcihET01TdHJpbmcgdHlwZUFyZywgb3B0aW9uYWwgSW5wdXRFdmVudEluaXQgaW5wdXRFdmVudEluaXREaWN0KV1cbiAgICAvLyBpbnRlcmZhY2UgSW5wdXRFdmVudCA6IFVJRXZlbnQge1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgRE9NU3RyaW5nIGlucHV0VHlwZTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIERPTVN0cmluZyBkYXRhO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgIGlzQ29tcG9zaW5nO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgUmFuZ2UgICAgIHRhcmdldFJhbmdlO1xuICAgIC8vIH07XG5cbiAgICBVSUV2ZW50LmNhbGwodGhpcywgZXYpO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgICAgSW5wdXRFdmVudCNpbnB1dFR5cGVcbiAgICAgKiBAdHlwZSAgICBTdHJpbmdcbiAgICAgKi9cbiAgICB0aGlzLmlucHV0VHlwZSA9IGV2LmlucHV0VHlwZTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lICAgIElucHV0RXZlbnQjZGF0YVxuICAgICAqIEB0eXBlICAgIFN0cmluZ1xuICAgICAqL1xuICAgIHRoaXMuZGF0YSA9IGV2LmRhdGE7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSAgICBJbnB1dEV2ZW50I2lzQ29tcG9zaW5nXG4gICAgICogQHR5cGUgICAgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMuaXNDb21wb3NpbmcgPSBldi5pc0NvbXBvc2luZztcblxuICAgIC8qKlxuICAgICAqICoqTGltaXRlZCBicm93c2VyIHN1cHBvcnQqKi5cbiAgICAgKlxuICAgICAqIEBuYW1lICAgIElucHV0RXZlbnQjdGFyZ2V0UmFuZ2VcbiAgICAgKiBAdHlwZSAgICBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy50YXJnZXRSYW5nZSA9IGV2LnRhcmdldFJhbmdlO1xufVxuXG5JbnB1dEV2ZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoVUlFdmVudC5wcm90b3R5cGUpO1xuSW5wdXRFdmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBJbnB1dEV2ZW50O1xuXG4vKipcbiAqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqL1xuSW5wdXRFdmVudC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdJbnB1dEV2ZW50Jztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSW5wdXRFdmVudDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFVJRXZlbnQgPSByZXF1aXJlKCcuL1VJRXZlbnQnKTtcblxuLyoqXG4gKiBTZWUgW1VJIEV2ZW50cyAoZm9ybWVybHkgRE9NIExldmVsIDMgRXZlbnRzKV0oaHR0cDovL3d3dy53My5vcmcvVFIvMjAxNS9XRC11aWV2ZW50cy0yMDE1MDQyOC8jZXZlbnRzLWtleWJvYXJkZXZlbnRzKS5cbiAqXG4gKiBAY2xhc3MgS2V5Ym9hcmRFdmVudFxuICogQGF1Z21lbnRzIFVJRXZlbnRcbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldiBUaGUgbmF0aXZlIERPTSBldmVudC5cbiAqL1xuZnVuY3Rpb24gS2V5Ym9hcmRFdmVudChldikge1xuICAgIC8vIFtDb25zdHJ1Y3RvcihET01TdHJpbmcgdHlwZUFyZywgb3B0aW9uYWwgS2V5Ym9hcmRFdmVudEluaXQga2V5Ym9hcmRFdmVudEluaXREaWN0KV1cbiAgICAvLyBpbnRlcmZhY2UgS2V5Ym9hcmRFdmVudCA6IFVJRXZlbnQge1xuICAgIC8vICAgICAvLyBLZXlMb2NhdGlvbkNvZGVcbiAgICAvLyAgICAgY29uc3QgdW5zaWduZWQgbG9uZyBET01fS0VZX0xPQ0FUSU9OX1NUQU5EQVJEID0gMHgwMDtcbiAgICAvLyAgICAgY29uc3QgdW5zaWduZWQgbG9uZyBET01fS0VZX0xPQ0FUSU9OX0xFRlQgPSAweDAxO1xuICAgIC8vICAgICBjb25zdCB1bnNpZ25lZCBsb25nIERPTV9LRVlfTE9DQVRJT05fUklHSFQgPSAweDAyO1xuICAgIC8vICAgICBjb25zdCB1bnNpZ25lZCBsb25nIERPTV9LRVlfTE9DQVRJT05fTlVNUEFEID0gMHgwMztcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIERPTVN0cmluZyAgICAga2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgRE9NU3RyaW5nICAgICBjb2RlO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgdW5zaWduZWQgbG9uZyBsb2NhdGlvbjtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgY3RybEtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgc2hpZnRLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgICAgIGFsdEtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgbWV0YUtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgcmVwZWF0O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgICAgICBpc0NvbXBvc2luZztcbiAgICAvLyAgICAgYm9vbGVhbiBnZXRNb2RpZmllclN0YXRlIChET01TdHJpbmcga2V5QXJnKTtcbiAgICAvLyB9O1xuXG4gICAgVUlFdmVudC5jYWxsKHRoaXMsIGV2KTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjRE9NX0tFWV9MT0NBVElPTl9TVEFOREFSRFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuRE9NX0tFWV9MT0NBVElPTl9TVEFOREFSRCA9IDB4MDA7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I0RPTV9LRVlfTE9DQVRJT05fTEVGVFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuRE9NX0tFWV9MT0NBVElPTl9MRUZUID0gMHgwMTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjRE9NX0tFWV9MT0NBVElPTl9SSUdIVFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuRE9NX0tFWV9MT0NBVElPTl9SSUdIVCA9IDB4MDI7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I0RPTV9LRVlfTE9DQVRJT05fTlVNUEFEXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5ET01fS0VZX0xPQ0FUSU9OX05VTVBBRCA9IDB4MDM7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I2tleVxuICAgICAqIEB0eXBlIFN0cmluZ1xuICAgICAqL1xuICAgIHRoaXMua2V5ID0gZXYua2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNjb2RlXG4gICAgICogQHR5cGUgU3RyaW5nXG4gICAgICovXG4gICAgdGhpcy5jb2RlID0gZXYuY29kZTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjbG9jYXRpb25cbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmxvY2F0aW9uID0gZXYubG9jYXRpb247XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I2N0cmxLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5jdHJsS2V5ID0gZXYuY3RybEtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjc2hpZnRLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5zaGlmdEtleSA9IGV2LnNoaWZ0S2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNhbHRLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5hbHRLZXkgPSBldi5hbHRLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I21ldGFLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5tZXRhS2V5ID0gZXYubWV0YUtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjcmVwZWF0XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMucmVwZWF0ID0gZXYucmVwZWF0O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNpc0NvbXBvc2luZ1xuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLmlzQ29tcG9zaW5nID0gZXYuaXNDb21wb3Npbmc7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I2tleUNvZGVcbiAgICAgKiBAdHlwZSBTdHJpbmdcbiAgICAgKiBAZGVwcmVjYXRlZFxuICAgICAqL1xuICAgIHRoaXMua2V5Q29kZSA9IGV2LmtleUNvZGU7XG59XG5cbktleWJvYXJkRXZlbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShVSUV2ZW50LnByb3RvdHlwZSk7XG5LZXlib2FyZEV2ZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEtleWJvYXJkRXZlbnQ7XG5cbi8qKlxuICogUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICovXG5LZXlib2FyZEV2ZW50LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ0tleWJvYXJkRXZlbnQnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBLZXlib2FyZEV2ZW50O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVUlFdmVudCA9IHJlcXVpcmUoJy4vVUlFdmVudCcpO1xuXG4vKipcbiAqIFNlZSBbVUkgRXZlbnRzIChmb3JtZXJseSBET00gTGV2ZWwgMyBFdmVudHMpXShodHRwOi8vd3d3LnczLm9yZy9UUi8yMDE1L1dELXVpZXZlbnRzLTIwMTUwNDI4LyNldmVudHMtbW91c2VldmVudHMpLlxuICpcbiAqIEBjbGFzcyBLZXlib2FyZEV2ZW50XG4gKiBAYXVnbWVudHMgVUlFdmVudFxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2IFRoZSBuYXRpdmUgRE9NIGV2ZW50LlxuICovXG5mdW5jdGlvbiBNb3VzZUV2ZW50KGV2KSB7XG4gICAgLy8gW0NvbnN0cnVjdG9yKERPTVN0cmluZyB0eXBlQXJnLCBvcHRpb25hbCBNb3VzZUV2ZW50SW5pdCBtb3VzZUV2ZW50SW5pdERpY3QpXVxuICAgIC8vIGludGVyZmFjZSBNb3VzZUV2ZW50IDogVUlFdmVudCB7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBsb25nICAgICAgICAgICBzY3JlZW5YO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgbG9uZyAgICAgICAgICAgc2NyZWVuWTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGxvbmcgICAgICAgICAgIGNsaWVudFg7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBsb25nICAgICAgICAgICBjbGllbnRZO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgICAgICAgY3RybEtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgIHNoaWZ0S2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgICAgICAgYWx0S2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgICAgICAgbWV0YUtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIHNob3J0ICAgICAgICAgIGJ1dHRvbjtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIEV2ZW50VGFyZ2V0PyAgIHJlbGF0ZWRUYXJnZXQ7XG4gICAgLy8gICAgIC8vIEludHJvZHVjZWQgaW4gdGhpcyBzcGVjaWZpY2F0aW9uXG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSB1bnNpZ25lZCBzaG9ydCBidXR0b25zO1xuICAgIC8vICAgICBib29sZWFuIGdldE1vZGlmaWVyU3RhdGUgKERPTVN0cmluZyBrZXlBcmcpO1xuICAgIC8vIH07XG5cbiAgICBVSUV2ZW50LmNhbGwodGhpcywgZXYpO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgTW91c2VFdmVudCNzY3JlZW5YXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5zY3JlZW5YID0gZXYuc2NyZWVuWDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIE1vdXNlRXZlbnQjc2NyZWVuWVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuc2NyZWVuWSA9IGV2LnNjcmVlblk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBNb3VzZUV2ZW50I2NsaWVudFhcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmNsaWVudFggPSBldi5jbGllbnRYO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgTW91c2VFdmVudCNjbGllbnRZXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5jbGllbnRZID0gZXYuY2xpZW50WTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIE1vdXNlRXZlbnQjY3RybEtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLmN0cmxLZXkgPSBldi5jdHJsS2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgTW91c2VFdmVudCNzaGlmdEtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLnNoaWZ0S2V5ID0gZXYuc2hpZnRLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBNb3VzZUV2ZW50I2FsdEtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLmFsdEtleSA9IGV2LmFsdEtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIE1vdXNlRXZlbnQjbWV0YUtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLm1ldGFLZXkgPSBldi5tZXRhS2V5O1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUgTW91c2VFdmVudCNidXR0b25cbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmJ1dHRvbiA9IGV2LmJ1dHRvbjtcblxuICAgIC8qKlxuICAgICAqIEB0eXBlIE1vdXNlRXZlbnQjYnV0dG9uc1xuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuYnV0dG9ucyA9IGV2LmJ1dHRvbnM7XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSBNb3VzZUV2ZW50I3BhZ2VYXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5wYWdlWCA9IGV2LnBhZ2VYO1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUgTW91c2VFdmVudCNwYWdlWVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMucGFnZVkgPSBldi5wYWdlWTtcblxuICAgIC8qKlxuICAgICAqIEB0eXBlIE1vdXNlRXZlbnQjeFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMueCA9IGV2Lng7XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSBNb3VzZUV2ZW50I3lcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnkgPSBldi55O1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUgTW91c2VFdmVudCNvZmZzZXRYXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5vZmZzZXRYID0gZXYub2Zmc2V0WDtcblxuICAgIC8qKlxuICAgICAqIEB0eXBlIE1vdXNlRXZlbnQjb2Zmc2V0WVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMub2Zmc2V0WSA9IGV2Lm9mZnNldFk7XG59XG5cbk1vdXNlRXZlbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShVSUV2ZW50LnByb3RvdHlwZSk7XG5Nb3VzZUV2ZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE1vdXNlRXZlbnQ7XG5cbi8qKlxuICogUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICovXG5Nb3VzZUV2ZW50LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ01vdXNlRXZlbnQnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNb3VzZUV2ZW50O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVUlFdmVudCA9IHJlcXVpcmUoJy4vVUlFdmVudCcpO1xuXG52YXIgRU1QVFlfQVJSQVkgPSBbXTtcblxuLyoqXG4gKiBTZWUgW1RvdWNoIEludGVyZmFjZV0oaHR0cDovL3d3dy53My5vcmcvVFIvMjAxMy9SRUMtdG91Y2gtZXZlbnRzLTIwMTMxMDEwLyN0b3VjaC1pbnRlcmZhY2UpLlxuICpcbiAqIEBjbGFzcyBUb3VjaFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0ge1RvdWNofSB0b3VjaCBUaGUgbmF0aXZlIFRvdWNoIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gVG91Y2godG91Y2gpIHtcbiAgICAvLyBpbnRlcmZhY2UgVG91Y2gge1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgbG9uZyAgICAgICAgaWRlbnRpZmllcjtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIEV2ZW50VGFyZ2V0IHRhcmdldDtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGRvdWJsZSAgICAgIHNjcmVlblg7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBkb3VibGUgICAgICBzY3JlZW5ZO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgZG91YmxlICAgICAgY2xpZW50WDtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGRvdWJsZSAgICAgIGNsaWVudFk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBkb3VibGUgICAgICBwYWdlWDtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGRvdWJsZSAgICAgIHBhZ2VZO1xuICAgIC8vIH07XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaCNpZGVudGlmaWVyXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5pZGVudGlmaWVyID0gdG91Y2guaWRlbnRpZmllcjtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoI3NjcmVlblhcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnNjcmVlblggPSB0b3VjaC5zY3JlZW5YO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2gjc2NyZWVuWVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuc2NyZWVuWSA9IHRvdWNoLnNjcmVlblk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaCNjbGllbnRYXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5jbGllbnRYID0gdG91Y2guY2xpZW50WDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoI2NsaWVudFlcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmNsaWVudFkgPSB0b3VjaC5jbGllbnRZO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2gjcGFnZVhcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnBhZ2VYID0gdG91Y2gucGFnZVg7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaCNwYWdlWVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMucGFnZVkgPSB0b3VjaC5wYWdlWTtcbn1cblxuXG4vKipcbiAqIE5vcm1hbGl6ZXMgdGhlIGJyb3dzZXIncyBuYXRpdmUgVG91Y2hMaXN0IGJ5IGNvbnZlcnRpbmcgaXQgaW50byBhbiBhcnJheSBvZlxuICogbm9ybWFsaXplZCBUb3VjaCBvYmplY3RzLlxuICpcbiAqIEBtZXRob2QgIGNsb25lVG91Y2hMaXN0XG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSAge1RvdWNoTGlzdH0gdG91Y2hMaXN0ICAgIFRoZSBuYXRpdmUgVG91Y2hMaXN0IGFycmF5LlxuICogQHJldHVybiB7QXJyYXkuPFRvdWNoPn0gICAgICAgICAgQW4gYXJyYXkgb2Ygbm9ybWFsaXplZCBUb3VjaCBvYmplY3RzLlxuICovXG5mdW5jdGlvbiBjbG9uZVRvdWNoTGlzdCh0b3VjaExpc3QpIHtcbiAgICBpZiAoIXRvdWNoTGlzdCkgcmV0dXJuIEVNUFRZX0FSUkFZO1xuICAgIC8vIGludGVyZmFjZSBUb3VjaExpc3Qge1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgdW5zaWduZWQgbG9uZyBsZW5ndGg7XG4gICAgLy8gICAgIGdldHRlciBUb3VjaD8gaXRlbSAodW5zaWduZWQgbG9uZyBpbmRleCk7XG4gICAgLy8gfTtcblxuICAgIHZhciB0b3VjaExpc3RBcnJheSA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG91Y2hMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRvdWNoTGlzdEFycmF5W2ldID0gbmV3IFRvdWNoKHRvdWNoTGlzdFtpXSk7XG4gICAgfVxuICAgIHJldHVybiB0b3VjaExpc3RBcnJheTtcbn1cblxuLyoqXG4gKiBTZWUgW1RvdWNoIEV2ZW50IEludGVyZmFjZV0oaHR0cDovL3d3dy53My5vcmcvVFIvMjAxMy9SRUMtdG91Y2gtZXZlbnRzLTIwMTMxMDEwLyN0b3VjaGV2ZW50LWludGVyZmFjZSkuXG4gKlxuICogQGNsYXNzIFRvdWNoRXZlbnRcbiAqIEBhdWdtZW50cyBVSUV2ZW50XG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXYgVGhlIG5hdGl2ZSBET00gZXZlbnQuXG4gKi9cbmZ1bmN0aW9uIFRvdWNoRXZlbnQoZXYpIHtcbiAgICAvLyBpbnRlcmZhY2UgVG91Y2hFdmVudCA6IFVJRXZlbnQge1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgVG91Y2hMaXN0IHRvdWNoZXM7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBUb3VjaExpc3QgdGFyZ2V0VG91Y2hlcztcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIFRvdWNoTGlzdCBjaGFuZ2VkVG91Y2hlcztcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICBhbHRLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgbWV0YUtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICBjdHJsS2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgIHNoaWZ0S2V5O1xuICAgIC8vIH07XG4gICAgVUlFdmVudC5jYWxsKHRoaXMsIGV2KTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoRXZlbnQjdG91Y2hlc1xuICAgICAqIEB0eXBlIEFycmF5LjxUb3VjaD5cbiAgICAgKi9cbiAgICB0aGlzLnRvdWNoZXMgPSBjbG9uZVRvdWNoTGlzdChldi50b3VjaGVzKTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoRXZlbnQjdGFyZ2V0VG91Y2hlc1xuICAgICAqIEB0eXBlIEFycmF5LjxUb3VjaD5cbiAgICAgKi9cbiAgICB0aGlzLnRhcmdldFRvdWNoZXMgPSBjbG9uZVRvdWNoTGlzdChldi50YXJnZXRUb3VjaGVzKTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoRXZlbnQjY2hhbmdlZFRvdWNoZXNcbiAgICAgKiBAdHlwZSBUb3VjaExpc3RcbiAgICAgKi9cbiAgICB0aGlzLmNoYW5nZWRUb3VjaGVzID0gY2xvbmVUb3VjaExpc3QoZXYuY2hhbmdlZFRvdWNoZXMpO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2hFdmVudCNhbHRLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5hbHRLZXkgPSBldi5hbHRLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaEV2ZW50I21ldGFLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5tZXRhS2V5ID0gZXYubWV0YUtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoRXZlbnQjY3RybEtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLmN0cmxLZXkgPSBldi5jdHJsS2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2hFdmVudCNzaGlmdEtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLnNoaWZ0S2V5ID0gZXYuc2hpZnRLZXk7XG59XG5cblRvdWNoRXZlbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShVSUV2ZW50LnByb3RvdHlwZSk7XG5Ub3VjaEV2ZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFRvdWNoRXZlbnQ7XG5cbi8qKlxuICogUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICovXG5Ub3VjaEV2ZW50LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ1RvdWNoRXZlbnQnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUb3VjaEV2ZW50O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZlbnQgPSByZXF1aXJlKCcuL0V2ZW50Jyk7XG5cbi8qKlxuICogU2VlIFtVSSBFdmVudHMgKGZvcm1lcmx5IERPTSBMZXZlbCAzIEV2ZW50cyldKGh0dHA6Ly93d3cudzMub3JnL1RSLzIwMTUvV0QtdWlldmVudHMtMjAxNTA0MjgpLlxuICpcbiAqIEBjbGFzcyBVSUV2ZW50XG4gKiBAYXVnbWVudHMgRXZlbnRcbiAqXG4gKiBAcGFyYW0gIHtFdmVudH0gZXYgICBUaGUgbmF0aXZlIERPTSBldmVudC5cbiAqL1xuZnVuY3Rpb24gVUlFdmVudChldikge1xuICAgIC8vIFtDb25zdHJ1Y3RvcihET01TdHJpbmcgdHlwZSwgb3B0aW9uYWwgVUlFdmVudEluaXQgZXZlbnRJbml0RGljdCldXG4gICAgLy8gaW50ZXJmYWNlIFVJRXZlbnQgOiBFdmVudCB7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBXaW5kb3c/IHZpZXc7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBsb25nICAgIGRldGFpbDtcbiAgICAvLyB9O1xuICAgIEV2ZW50LmNhbGwodGhpcywgZXYpO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVUlFdmVudCNkZXRhaWxcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmRldGFpbCA9IGV2LmRldGFpbDtcbn1cblxuVUlFdmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50LnByb3RvdHlwZSk7XG5VSUV2ZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFVJRXZlbnQ7XG5cbi8qKlxuICogUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICovXG5VSUV2ZW50LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ1VJRXZlbnQnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBVSUV2ZW50O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgTW91c2VFdmVudCA9IHJlcXVpcmUoJy4vTW91c2VFdmVudCcpO1xuXG4vKipcbiAqIFNlZSBbVUkgRXZlbnRzIChmb3JtZXJseSBET00gTGV2ZWwgMyBFdmVudHMpXShodHRwOi8vd3d3LnczLm9yZy9UUi8yMDE1L1dELXVpZXZlbnRzLTIwMTUwNDI4LyNldmVudHMtd2hlZWxldmVudHMpLlxuICpcbiAqIEBjbGFzcyBXaGVlbEV2ZW50XG4gKiBAYXVnbWVudHMgVUlFdmVudFxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2IFRoZSBuYXRpdmUgRE9NIGV2ZW50LlxuICovXG5mdW5jdGlvbiBXaGVlbEV2ZW50KGV2KSB7XG4gICAgLy8gW0NvbnN0cnVjdG9yKERPTVN0cmluZyB0eXBlQXJnLCBvcHRpb25hbCBXaGVlbEV2ZW50SW5pdCB3aGVlbEV2ZW50SW5pdERpY3QpXVxuICAgIC8vIGludGVyZmFjZSBXaGVlbEV2ZW50IDogTW91c2VFdmVudCB7XG4gICAgLy8gICAgIC8vIERlbHRhTW9kZUNvZGVcbiAgICAvLyAgICAgY29uc3QgdW5zaWduZWQgbG9uZyBET01fREVMVEFfUElYRUwgPSAweDAwO1xuICAgIC8vICAgICBjb25zdCB1bnNpZ25lZCBsb25nIERPTV9ERUxUQV9MSU5FID0gMHgwMTtcbiAgICAvLyAgICAgY29uc3QgdW5zaWduZWQgbG9uZyBET01fREVMVEFfUEFHRSA9IDB4MDI7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBkb3VibGUgICAgICAgIGRlbHRhWDtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGRvdWJsZSAgICAgICAgZGVsdGFZO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgZG91YmxlICAgICAgICBkZWx0YVo7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSB1bnNpZ25lZCBsb25nIGRlbHRhTW9kZTtcbiAgICAvLyB9O1xuXG4gICAgTW91c2VFdmVudC5jYWxsKHRoaXMsIGV2KTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFdoZWVsRXZlbnQjRE9NX0RFTFRBX1BJWEVMXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5ET01fREVMVEFfUElYRUwgPSAweDAwO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgV2hlZWxFdmVudCNET01fREVMVEFfTElORVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuRE9NX0RFTFRBX0xJTkUgPSAweDAxO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgV2hlZWxFdmVudCNET01fREVMVEFfUEFHRVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuRE9NX0RFTFRBX1BBR0UgPSAweDAyO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgV2hlZWxFdmVudCNkZWx0YVhcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmRlbHRhWCA9IGV2LmRlbHRhWDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFdoZWVsRXZlbnQjZGVsdGFZXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5kZWx0YVkgPSBldi5kZWx0YVk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBXaGVlbEV2ZW50I2RlbHRhWlxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuZGVsdGFaID0gZXYuZGVsdGFaO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgV2hlZWxFdmVudCNkZWx0YU1vZGVcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmRlbHRhTW9kZSA9IGV2LmRlbHRhTW9kZTtcbn1cblxuV2hlZWxFdmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE1vdXNlRXZlbnQucHJvdG90eXBlKTtcbldoZWVsRXZlbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gV2hlZWxFdmVudDtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIG5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBOYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKi9cbldoZWVsRXZlbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAnV2hlZWxFdmVudCc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFdoZWVsRXZlbnQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQSB0d28tZGltZW5zaW9uYWwgdmVjdG9yLlxuICpcbiAqIEBjbGFzcyBWZWMyXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggVGhlIHggY29tcG9uZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9IHkgVGhlIHkgY29tcG9uZW50LlxuICovXG52YXIgVmVjMiA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICBpZiAoeCBpbnN0YW5jZW9mIEFycmF5IHx8IHggaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXkpIHtcbiAgICAgICAgdGhpcy54ID0geFswXSB8fCAwO1xuICAgICAgICB0aGlzLnkgPSB4WzFdIHx8IDA7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnggPSB4IHx8IDA7XG4gICAgICAgIHRoaXMueSA9IHkgfHwgMDtcbiAgICB9XG59O1xuXG4vKipcbiAqIFNldCB0aGUgY29tcG9uZW50cyBvZiB0aGUgY3VycmVudCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0geCBUaGUgeCBjb21wb25lbnQuXG4gKiBAcGFyYW0ge051bWJlcn0geSBUaGUgeSBjb21wb25lbnQuXG4gKlxuICogQHJldHVybiB7VmVjMn0gdGhpc1xuICovXG5WZWMyLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiBzZXQoeCwgeSkge1xuICAgIGlmICh4ICE9IG51bGwpIHRoaXMueCA9IHg7XG4gICAgaWYgKHkgIT0gbnVsbCkgdGhpcy55ID0geTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkIHRoZSBpbnB1dCB2IHRvIHRoZSBjdXJyZW50IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjMn0gdiBUaGUgVmVjMiB0byBhZGQuXG4gKlxuICogQHJldHVybiB7VmVjMn0gdGhpc1xuICovXG5WZWMyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiBhZGQodikge1xuICAgIHRoaXMueCArPSB2Lng7XG4gICAgdGhpcy55ICs9IHYueTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU3VidHJhY3QgdGhlIGlucHV0IHYgZnJvbSB0aGUgY3VycmVudCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzJ9IHYgVGhlIFZlYzIgdG8gc3VidHJhY3QuXG4gKlxuICogQHJldHVybiB7VmVjMn0gdGhpc1xuICovXG5WZWMyLnByb3RvdHlwZS5zdWJ0cmFjdCA9IGZ1bmN0aW9uIHN1YnRyYWN0KHYpIHtcbiAgICB0aGlzLnggLT0gdi54O1xuICAgIHRoaXMueSAtPSB2Lnk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNjYWxlIHRoZSBjdXJyZW50IFZlYzIgYnkgYSBzY2FsYXIgb3IgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ8VmVjMn0gcyBUaGUgTnVtYmVyIG9yIHZlYzIgYnkgd2hpY2ggdG8gc2NhbGUuXG4gKlxuICogQHJldHVybiB7VmVjMn0gdGhpc1xuICovXG5WZWMyLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uIHNjYWxlKHMpIHtcbiAgICBpZiAocyBpbnN0YW5jZW9mIFZlYzIpIHtcbiAgICAgICAgdGhpcy54ICo9IHMueDtcbiAgICAgICAgdGhpcy55ICo9IHMueTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMueCAqPSBzO1xuICAgICAgICB0aGlzLnkgKj0gcztcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJvdGF0ZSB0aGUgVmVjMiBjb3VudGVyLWNsb2Nrd2lzZSBieSB0aGV0YSBhYm91dCB0aGUgei1heGlzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdGhldGEgQW5nbGUgYnkgd2hpY2ggdG8gcm90YXRlLlxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IHRoaXNcbiAqL1xuVmVjMi5wcm90b3R5cGUucm90YXRlID0gZnVuY3Rpb24odGhldGEpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcblxuICAgIHZhciBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKTtcbiAgICB2YXIgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSk7XG5cbiAgICB0aGlzLnggPSB4ICogY29zVGhldGEgLSB5ICogc2luVGhldGE7XG4gICAgdGhpcy55ID0geCAqIHNpblRoZXRhICsgeSAqIGNvc1RoZXRhO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFRoZSBkb3QgcHJvZHVjdCBvZiBvZiB0aGUgY3VycmVudCBWZWMyIHdpdGggdGhlIGlucHV0IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB2IFRoZSBvdGhlciBWZWMyLlxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IHRoaXNcbiAqL1xuVmVjMi5wcm90b3R5cGUuZG90ID0gZnVuY3Rpb24odikge1xuICAgIHJldHVybiB0aGlzLnggKiB2LnggKyB0aGlzLnkgKiB2Lnk7XG59O1xuXG4vKipcbiAqIFRoZSBjcm9zcyBwcm9kdWN0IG9mIG9mIHRoZSBjdXJyZW50IFZlYzIgd2l0aCB0aGUgaW5wdXQgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHYgVGhlIG90aGVyIFZlYzIuXG4gKlxuICogQHJldHVybiB7VmVjMn0gdGhpc1xuICovXG5WZWMyLnByb3RvdHlwZS5jcm9zcyA9IGZ1bmN0aW9uKHYpIHtcbiAgICByZXR1cm4gdGhpcy54ICogdi55IC0gdGhpcy55ICogdi54O1xufTtcblxuLyoqXG4gKiBQcmVzZXJ2ZSB0aGUgbWFnbml0dWRlIGJ1dCBpbnZlcnQgdGhlIG9yaWVudGF0aW9uIG9mIHRoZSBjdXJyZW50IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IHRoaXNcbiAqL1xuVmVjMi5wcm90b3R5cGUuaW52ZXJ0ID0gZnVuY3Rpb24gaW52ZXJ0KCkge1xuICAgIHRoaXMueCAqPSAtMTtcbiAgICB0aGlzLnkgKj0gLTE7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFwcGx5IGEgZnVuY3Rpb24gY29tcG9uZW50LXdpc2UgdG8gdGhlIGN1cnJlbnQgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gRnVuY3Rpb24gdG8gYXBwbHkuXG4gKlxuICogQHJldHVybiB7VmVjMn0gdGhpc1xuICovXG5WZWMyLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiBtYXAoZm4pIHtcbiAgICB0aGlzLnggPSBmbih0aGlzLngpO1xuICAgIHRoaXMueSA9IGZuKHRoaXMueSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgbWFnbml0dWRlIG9mIHRoZSBjdXJyZW50IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIGxlbmd0aCBvZiB0aGUgdmVjdG9yXG4gKi9cblZlYzIucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uIGxlbmd0aCgpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcblxuICAgIHJldHVybiBNYXRoLnNxcnQoeCAqIHggKyB5ICogeSk7XG59O1xuXG4vKipcbiAqIENvcHkgdGhlIGlucHV0IG9udG8gdGhlIGN1cnJlbnQgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMyfSB2IFZlYzIgdG8gY29weVxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IHRoaXNcbiAqL1xuVmVjMi5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkodikge1xuICAgIHRoaXMueCA9IHYueDtcbiAgICB0aGlzLnkgPSB2Lnk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlc2V0IHRoZSBjdXJyZW50IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IHRoaXNcbiAqL1xuVmVjMi5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiBjbGVhcigpIHtcbiAgICB0aGlzLnggPSAwO1xuICAgIHRoaXMueSA9IDA7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgdGhlIG1hZ25pdHVkZSBvZiB0aGUgY3VycmVudCBWZWMyIGlzIGV4YWN0bHkgMC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7Qm9vbGVhbn0gd2hldGhlciBvciBub3QgdGhlIGxlbmd0aCBpcyAwXG4gKi9cblZlYzIucHJvdG90eXBlLmlzWmVybyA9IGZ1bmN0aW9uIGlzWmVybygpIHtcbiAgICBpZiAodGhpcy54ICE9PSAwIHx8IHRoaXMueSAhPT0gMCkgcmV0dXJuIGZhbHNlO1xuICAgIGVsc2UgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFRoZSBhcnJheSBmb3JtIG9mIHRoZSBjdXJyZW50IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0FycmF5fSB0aGUgVmVjIHRvIGFzIGFuIGFycmF5XG4gKi9cblZlYzIucHJvdG90eXBlLnRvQXJyYXkgPSBmdW5jdGlvbiB0b0FycmF5KCkge1xuICAgIHJldHVybiBbdGhpcy54LCB0aGlzLnldO1xufTtcblxuLyoqXG4gKiBOb3JtYWxpemUgdGhlIGlucHV0IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjMn0gdiBUaGUgcmVmZXJlbmNlIFZlYzIuXG4gKiBAcGFyYW0ge1ZlYzJ9IG91dHB1dCBWZWMyIGluIHdoaWNoIHRvIHBsYWNlIHRoZSByZXN1bHQuXG4gKlxuICogQHJldHVybiB7VmVjMn0gVGhlIG5vcm1hbGl6ZWQgVmVjMi5cbiAqL1xuVmVjMi5ub3JtYWxpemUgPSBmdW5jdGlvbiBub3JtYWxpemUodiwgb3V0cHV0KSB7XG4gICAgdmFyIHggPSB2Lng7XG4gICAgdmFyIHkgPSB2Lnk7XG5cbiAgICB2YXIgbGVuZ3RoID0gTWF0aC5zcXJ0KHggKiB4ICsgeSAqIHkpIHx8IDE7XG4gICAgbGVuZ3RoID0gMSAvIGxlbmd0aDtcbiAgICBvdXRwdXQueCA9IHYueCAqIGxlbmd0aDtcbiAgICBvdXRwdXQueSA9IHYueSAqIGxlbmd0aDtcblxuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG4vKipcbiAqIENsb25lIHRoZSBpbnB1dCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzJ9IHYgVGhlIFZlYzIgdG8gY2xvbmUuXG4gKlxuICogQHJldHVybiB7VmVjMn0gVGhlIGNsb25lZCBWZWMyLlxuICovXG5WZWMyLmNsb25lID0gZnVuY3Rpb24gY2xvbmUodikge1xuICAgIHJldHVybiBuZXcgVmVjMih2LngsIHYueSk7XG59O1xuXG4vKipcbiAqIEFkZCB0aGUgaW5wdXQgVmVjMidzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzJ9IHYxIFRoZSBsZWZ0IFZlYzIuXG4gKiBAcGFyYW0ge1ZlYzJ9IHYyIFRoZSByaWdodCBWZWMyLlxuICogQHBhcmFtIHtWZWMyfSBvdXRwdXQgVmVjMiBpbiB3aGljaCB0byBwbGFjZSB0aGUgcmVzdWx0LlxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IFRoZSByZXN1bHQgb2YgdGhlIGFkZGl0aW9uLlxuICovXG5WZWMyLmFkZCA9IGZ1bmN0aW9uIGFkZCh2MSwgdjIsIG91dHB1dCkge1xuICAgIG91dHB1dC54ID0gdjEueCArIHYyLng7XG4gICAgb3V0cHV0LnkgPSB2MS55ICsgdjIueTtcblxuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG4vKipcbiAqIFN1YnRyYWN0IHRoZSBzZWNvbmQgVmVjMiBmcm9tIHRoZSBmaXJzdC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMyfSB2MSBUaGUgbGVmdCBWZWMyLlxuICogQHBhcmFtIHtWZWMyfSB2MiBUaGUgcmlnaHQgVmVjMi5cbiAqIEBwYXJhbSB7VmVjMn0gb3V0cHV0IFZlYzIgaW4gd2hpY2ggdG8gcGxhY2UgdGhlIHJlc3VsdC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMyfSBUaGUgcmVzdWx0IG9mIHRoZSBzdWJ0cmFjdGlvbi5cbiAqL1xuVmVjMi5zdWJ0cmFjdCA9IGZ1bmN0aW9uIHN1YnRyYWN0KHYxLCB2Miwgb3V0cHV0KSB7XG4gICAgb3V0cHV0LnggPSB2MS54IC0gdjIueDtcbiAgICBvdXRwdXQueSA9IHYxLnkgLSB2Mi55O1xuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG4vKipcbiAqIFNjYWxlIHRoZSBpbnB1dCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzJ9IHYgVGhlIHJlZmVyZW5jZSBWZWMyLlxuICogQHBhcmFtIHtOdW1iZXJ9IHMgTnVtYmVyIHRvIHNjYWxlIGJ5LlxuICogQHBhcmFtIHtWZWMyfSBvdXRwdXQgVmVjMiBpbiB3aGljaCB0byBwbGFjZSB0aGUgcmVzdWx0LlxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IFRoZSByZXN1bHQgb2YgdGhlIHNjYWxpbmcuXG4gKi9cblZlYzIuc2NhbGUgPSBmdW5jdGlvbiBzY2FsZSh2LCBzLCBvdXRwdXQpIHtcbiAgICBvdXRwdXQueCA9IHYueCAqIHM7XG4gICAgb3V0cHV0LnkgPSB2LnkgKiBzO1xuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG4vKipcbiAqIFRoZSBkb3QgcHJvZHVjdCBvZiB0aGUgaW5wdXQgVmVjMidzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzJ9IHYxIFRoZSBsZWZ0IFZlYzIuXG4gKiBAcGFyYW0ge1ZlYzJ9IHYyIFRoZSByaWdodCBWZWMyLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gVGhlIGRvdCBwcm9kdWN0LlxuICovXG5WZWMyLmRvdCA9IGZ1bmN0aW9uIGRvdCh2MSwgdjIpIHtcbiAgICByZXR1cm4gdjEueCAqIHYyLnggKyB2MS55ICogdjIueTtcbn07XG5cbi8qKlxuICogVGhlIGNyb3NzIHByb2R1Y3Qgb2YgdGhlIGlucHV0IFZlYzIncy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHYxIFRoZSBsZWZ0IFZlYzIuXG4gKiBAcGFyYW0ge051bWJlcn0gdjIgVGhlIHJpZ2h0IFZlYzIuXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSBUaGUgei1jb21wb25lbnQgb2YgdGhlIGNyb3NzIHByb2R1Y3QuXG4gKi9cblZlYzIuY3Jvc3MgPSBmdW5jdGlvbih2MSx2Mikge1xuICAgIHJldHVybiB2MS54ICogdjIueSAtIHYxLnkgKiB2Mi54O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBWZWMyO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEEgdGhyZWUtZGltZW5zaW9uYWwgdmVjdG9yLlxuICpcbiAqIEBjbGFzcyBWZWMzXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggVGhlIHggY29tcG9uZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9IHkgVGhlIHkgY29tcG9uZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9IHogVGhlIHogY29tcG9uZW50LlxuICovXG52YXIgVmVjMyA9IGZ1bmN0aW9uKHggLHksIHope1xuICAgIHRoaXMueCA9IHggfHwgMDtcbiAgICB0aGlzLnkgPSB5IHx8IDA7XG4gICAgdGhpcy56ID0geiB8fCAwO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIGNvbXBvbmVudHMgb2YgdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggVGhlIHggY29tcG9uZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9IHkgVGhlIHkgY29tcG9uZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9IHogVGhlIHogY29tcG9uZW50LlxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gc2V0KHgsIHksIHopIHtcbiAgICBpZiAoeCAhPSBudWxsKSB0aGlzLnggPSB4O1xuICAgIGlmICh5ICE9IG51bGwpIHRoaXMueSA9IHk7XG4gICAgaWYgKHogIT0gbnVsbCkgdGhpcy56ID0gejtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGQgdGhlIGlucHV0IHYgdG8gdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2IFRoZSBWZWMzIHRvIGFkZC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZCh2KSB7XG4gICAgdGhpcy54ICs9IHYueDtcbiAgICB0aGlzLnkgKz0gdi55O1xuICAgIHRoaXMueiArPSB2Lno7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU3VidHJhY3QgdGhlIGlucHV0IHYgZnJvbSB0aGUgY3VycmVudCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzN9IHYgVGhlIFZlYzMgdG8gc3VidHJhY3QuXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5zdWJ0cmFjdCA9IGZ1bmN0aW9uIHN1YnRyYWN0KHYpIHtcbiAgICB0aGlzLnggLT0gdi54O1xuICAgIHRoaXMueSAtPSB2Lnk7XG4gICAgdGhpcy56IC09IHYuejtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSb3RhdGUgdGhlIGN1cnJlbnQgVmVjMyBieSB0aGV0YSBjbG9ja3dpc2UgYWJvdXQgdGhlIHggYXhpcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRoZXRhIEFuZ2xlIGJ5IHdoaWNoIHRvIHJvdGF0ZS5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLnJvdGF0ZVggPSBmdW5jdGlvbiByb3RhdGVYKHRoZXRhKSB7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICB2YXIgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSk7XG4gICAgdmFyIHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpO1xuXG4gICAgdGhpcy55ID0geSAqIGNvc1RoZXRhIC0geiAqIHNpblRoZXRhO1xuICAgIHRoaXMueiA9IHkgKiBzaW5UaGV0YSArIHogKiBjb3NUaGV0YTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSb3RhdGUgdGhlIGN1cnJlbnQgVmVjMyBieSB0aGV0YSBjbG9ja3dpc2UgYWJvdXQgdGhlIHkgYXhpcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRoZXRhIEFuZ2xlIGJ5IHdoaWNoIHRvIHJvdGF0ZS5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLnJvdGF0ZVkgPSBmdW5jdGlvbiByb3RhdGVZKHRoZXRhKSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICB2YXIgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSk7XG4gICAgdmFyIHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpO1xuXG4gICAgdGhpcy54ID0geiAqIHNpblRoZXRhICsgeCAqIGNvc1RoZXRhO1xuICAgIHRoaXMueiA9IHogKiBjb3NUaGV0YSAtIHggKiBzaW5UaGV0YTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSb3RhdGUgdGhlIGN1cnJlbnQgVmVjMyBieSB0aGV0YSBjbG9ja3dpc2UgYWJvdXQgdGhlIHogYXhpcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRoZXRhIEFuZ2xlIGJ5IHdoaWNoIHRvIHJvdGF0ZS5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLnJvdGF0ZVogPSBmdW5jdGlvbiByb3RhdGVaKHRoZXRhKSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG5cbiAgICB2YXIgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSk7XG4gICAgdmFyIHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpO1xuXG4gICAgdGhpcy54ID0geCAqIGNvc1RoZXRhIC0geSAqIHNpblRoZXRhO1xuICAgIHRoaXMueSA9IHggKiBzaW5UaGV0YSArIHkgKiBjb3NUaGV0YTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBUaGUgZG90IHByb2R1Y3Qgb2YgdGhlIGN1cnJlbnQgVmVjMyB3aXRoIGlucHV0IFZlYzMgdi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2IFRoZSBvdGhlciBWZWMzLlxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUuZG90ID0gZnVuY3Rpb24gZG90KHYpIHtcbiAgICByZXR1cm4gdGhpcy54KnYueCArIHRoaXMueSp2LnkgKyB0aGlzLnoqdi56O1xufTtcblxuLyoqXG4gKiBUaGUgZG90IHByb2R1Y3Qgb2YgdGhlIGN1cnJlbnQgVmVjMyB3aXRoIGlucHV0IFZlYzMgdi5cbiAqIFN0b3JlcyB0aGUgcmVzdWx0IGluIHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZCBjcm9zc1xuICpcbiAqIEBwYXJhbSB7VmVjM30gdiBUaGUgb3RoZXIgVmVjM1xuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUuY3Jvc3MgPSBmdW5jdGlvbiBjcm9zcyh2KSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICB2YXIgdnggPSB2Lng7XG4gICAgdmFyIHZ5ID0gdi55O1xuICAgIHZhciB2eiA9IHYuejtcblxuICAgIHRoaXMueCA9IHkgKiB2eiAtIHogKiB2eTtcbiAgICB0aGlzLnkgPSB6ICogdnggLSB4ICogdno7XG4gICAgdGhpcy56ID0geCAqIHZ5IC0geSAqIHZ4O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTY2FsZSB0aGUgY3VycmVudCBWZWMzIGJ5IGEgc2NhbGFyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gcyBUaGUgTnVtYmVyIGJ5IHdoaWNoIHRvIHNjYWxlXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uIHNjYWxlKHMpIHtcbiAgICB0aGlzLnggKj0gcztcbiAgICB0aGlzLnkgKj0gcztcbiAgICB0aGlzLnogKj0gcztcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBQcmVzZXJ2ZSB0aGUgbWFnbml0dWRlIGJ1dCBpbnZlcnQgdGhlIG9yaWVudGF0aW9uIG9mIHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUuaW52ZXJ0ID0gZnVuY3Rpb24gaW52ZXJ0KCkge1xuICAgIHRoaXMueCA9IC10aGlzLng7XG4gICAgdGhpcy55ID0gLXRoaXMueTtcbiAgICB0aGlzLnogPSAtdGhpcy56O1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFwcGx5IGEgZnVuY3Rpb24gY29tcG9uZW50LXdpc2UgdG8gdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gRnVuY3Rpb24gdG8gYXBwbHkuXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiBtYXAoZm4pIHtcbiAgICB0aGlzLnggPSBmbih0aGlzLngpO1xuICAgIHRoaXMueSA9IGZuKHRoaXMueSk7XG4gICAgdGhpcy56ID0gZm4odGhpcy56KTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBUaGUgbWFnbml0dWRlIG9mIHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIG1hZ25pdHVkZSBvZiB0aGUgVmVjM1xuICovXG5WZWMzLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbiBsZW5ndGgoKSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICByZXR1cm4gTWF0aC5zcXJ0KHggKiB4ICsgeSAqIHkgKyB6ICogeik7XG59O1xuXG4vKipcbiAqIFRoZSBtYWduaXR1ZGUgc3F1YXJlZCBvZiB0aGUgY3VycmVudCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IG1hZ25pdHVkZSBvZiB0aGUgVmVjMyBzcXVhcmVkXG4gKi9cblZlYzMucHJvdG90eXBlLmxlbmd0aFNxID0gZnVuY3Rpb24gbGVuZ3RoU3EoKSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICByZXR1cm4geCAqIHggKyB5ICogeSArIHogKiB6O1xufTtcblxuLyoqXG4gKiBDb3B5IHRoZSBpbnB1dCBvbnRvIHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdiBWZWMzIHRvIGNvcHlcbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiBjb3B5KHYpIHtcbiAgICB0aGlzLnggPSB2Lng7XG4gICAgdGhpcy55ID0gdi55O1xuICAgIHRoaXMueiA9IHYuejtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVzZXQgdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uIGNsZWFyKCkge1xuICAgIHRoaXMueCA9IDA7XG4gICAgdGhpcy55ID0gMDtcbiAgICB0aGlzLnogPSAwO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIHRoZSBtYWduaXR1ZGUgb2YgdGhlIGN1cnJlbnQgVmVjMyBpcyBleGFjdGx5IDAuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHdoZXRoZXIgb3Igbm90IHRoZSBtYWduaXR1ZGUgaXMgemVyb1xuICovXG5WZWMzLnByb3RvdHlwZS5pc1plcm8gPSBmdW5jdGlvbiBpc1plcm8oKSB7XG4gICAgcmV0dXJuIHRoaXMueCA9PT0gMCAmJiB0aGlzLnkgPT09IDAgJiYgdGhpcy56ID09PSAwO1xufTtcblxuLyoqXG4gKiBUaGUgYXJyYXkgZm9ybSBvZiB0aGUgY3VycmVudCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gYSB0aHJlZSBlbGVtZW50IGFycmF5IHJlcHJlc2VudGluZyB0aGUgY29tcG9uZW50cyBvZiB0aGUgVmVjM1xuICovXG5WZWMzLnByb3RvdHlwZS50b0FycmF5ID0gZnVuY3Rpb24gdG9BcnJheSgpIHtcbiAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55LCB0aGlzLnpdO1xufTtcblxuLyoqXG4gKiBQcmVzZXJ2ZSB0aGUgb3JpZW50YXRpb24gYnV0IGNoYW5nZSB0aGUgbGVuZ3RoIG9mIHRoZSBjdXJyZW50IFZlYzMgdG8gMS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5ub3JtYWxpemUgPSBmdW5jdGlvbiBub3JtYWxpemUoKSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICB2YXIgbGVuID0gTWF0aC5zcXJ0KHggKiB4ICsgeSAqIHkgKyB6ICogeikgfHwgMTtcbiAgICBsZW4gPSAxIC8gbGVuO1xuXG4gICAgdGhpcy54ICo9IGxlbjtcbiAgICB0aGlzLnkgKj0gbGVuO1xuICAgIHRoaXMueiAqPSBsZW47XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFwcGx5IHRoZSByb3RhdGlvbiBjb3JyZXNwb25kaW5nIHRvIHRoZSBpbnB1dCAodW5pdCkgUXVhdGVybmlvblxuICogdG8gdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtRdWF0ZXJuaW9ufSBxIFVuaXQgUXVhdGVybmlvbiByZXByZXNlbnRpbmcgdGhlIHJvdGF0aW9uIHRvIGFwcGx5XG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5hcHBseVJvdGF0aW9uID0gZnVuY3Rpb24gYXBwbHlSb3RhdGlvbihxKSB7XG4gICAgdmFyIGN3ID0gcS53O1xuICAgIHZhciBjeCA9IC1xLng7XG4gICAgdmFyIGN5ID0gLXEueTtcbiAgICB2YXIgY3ogPSAtcS56O1xuXG4gICAgdmFyIHZ4ID0gdGhpcy54O1xuICAgIHZhciB2eSA9IHRoaXMueTtcbiAgICB2YXIgdnogPSB0aGlzLno7XG5cbiAgICB2YXIgdHcgPSAtY3ggKiB2eCAtIGN5ICogdnkgLSBjeiAqIHZ6O1xuICAgIHZhciB0eCA9IHZ4ICogY3cgKyB2eSAqIGN6IC0gY3kgKiB2ejtcbiAgICB2YXIgdHkgPSB2eSAqIGN3ICsgY3ggKiB2eiAtIHZ4ICogY3o7XG4gICAgdmFyIHR6ID0gdnogKiBjdyArIHZ4ICogY3kgLSBjeCAqIHZ5O1xuXG4gICAgdmFyIHcgPSBjdztcbiAgICB2YXIgeCA9IC1jeDtcbiAgICB2YXIgeSA9IC1jeTtcbiAgICB2YXIgeiA9IC1jejtcblxuICAgIHRoaXMueCA9IHR4ICogdyArIHggKiB0dyArIHkgKiB0eiAtIHR5ICogejtcbiAgICB0aGlzLnkgPSB0eSAqIHcgKyB5ICogdHcgKyB0eCAqIHogLSB4ICogdHo7XG4gICAgdGhpcy56ID0gdHogKiB3ICsgeiAqIHR3ICsgeCAqIHR5IC0gdHggKiB5O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBcHBseSB0aGUgaW5wdXQgTWF0MzMgdGhlIHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TWF0MzN9IG1hdHJpeCBNYXQzMyB0byBhcHBseVxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUuYXBwbHlNYXRyaXggPSBmdW5jdGlvbiBhcHBseU1hdHJpeChtYXRyaXgpIHtcbiAgICB2YXIgTSA9IG1hdHJpeC5nZXQoKTtcblxuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB6ID0gdGhpcy56O1xuXG4gICAgdGhpcy54ID0gTVswXSp4ICsgTVsxXSp5ICsgTVsyXSp6O1xuICAgIHRoaXMueSA9IE1bM10qeCArIE1bNF0qeSArIE1bNV0qejtcbiAgICB0aGlzLnogPSBNWzZdKnggKyBNWzddKnkgKyBNWzhdKno7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIE5vcm1hbGl6ZSB0aGUgaW5wdXQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2IFRoZSByZWZlcmVuY2UgVmVjMy5cbiAqIEBwYXJhbSB7VmVjM30gb3V0cHV0IFZlYzMgaW4gd2hpY2ggdG8gcGxhY2UgdGhlIHJlc3VsdC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSBUaGUgbm9ybWFsaXplIFZlYzMuXG4gKi9cblZlYzMubm9ybWFsaXplID0gZnVuY3Rpb24gbm9ybWFsaXplKHYsIG91dHB1dCkge1xuICAgIHZhciB4ID0gdi54O1xuICAgIHZhciB5ID0gdi55O1xuICAgIHZhciB6ID0gdi56O1xuXG4gICAgdmFyIGxlbmd0aCA9IE1hdGguc3FydCh4ICogeCArIHkgKiB5ICsgeiAqIHopIHx8IDE7XG4gICAgbGVuZ3RoID0gMSAvIGxlbmd0aDtcblxuICAgIG91dHB1dC54ID0geCAqIGxlbmd0aDtcbiAgICBvdXRwdXQueSA9IHkgKiBsZW5ndGg7XG4gICAgb3V0cHV0LnogPSB6ICogbGVuZ3RoO1xuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG4vKipcbiAqIEFwcGx5IGEgcm90YXRpb24gdG8gdGhlIGlucHV0IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdiBUaGUgcmVmZXJlbmNlIFZlYzMuXG4gKiBAcGFyYW0ge1F1YXRlcm5pb259IHEgVW5pdCBRdWF0ZXJuaW9uIHJlcHJlc2VudGluZyB0aGUgcm90YXRpb24gdG8gYXBwbHkuXG4gKiBAcGFyYW0ge1ZlYzN9IG91dHB1dCBWZWMzIGluIHdoaWNoIHRvIHBsYWNlIHRoZSByZXN1bHQuXG4gKlxuICogQHJldHVybiB7VmVjM30gVGhlIHJvdGF0ZWQgdmVyc2lvbiBvZiB0aGUgaW5wdXQgVmVjMy5cbiAqL1xuVmVjMy5hcHBseVJvdGF0aW9uID0gZnVuY3Rpb24gYXBwbHlSb3RhdGlvbih2LCBxLCBvdXRwdXQpIHtcbiAgICB2YXIgY3cgPSBxLnc7XG4gICAgdmFyIGN4ID0gLXEueDtcbiAgICB2YXIgY3kgPSAtcS55O1xuICAgIHZhciBjeiA9IC1xLno7XG5cbiAgICB2YXIgdnggPSB2Lng7XG4gICAgdmFyIHZ5ID0gdi55O1xuICAgIHZhciB2eiA9IHYuejtcblxuICAgIHZhciB0dyA9IC1jeCAqIHZ4IC0gY3kgKiB2eSAtIGN6ICogdno7XG4gICAgdmFyIHR4ID0gdnggKiBjdyArIHZ5ICogY3ogLSBjeSAqIHZ6O1xuICAgIHZhciB0eSA9IHZ5ICogY3cgKyBjeCAqIHZ6IC0gdnggKiBjejtcbiAgICB2YXIgdHogPSB2eiAqIGN3ICsgdnggKiBjeSAtIGN4ICogdnk7XG5cbiAgICB2YXIgdyA9IGN3O1xuICAgIHZhciB4ID0gLWN4O1xuICAgIHZhciB5ID0gLWN5O1xuICAgIHZhciB6ID0gLWN6O1xuXG4gICAgb3V0cHV0LnggPSB0eCAqIHcgKyB4ICogdHcgKyB5ICogdHogLSB0eSAqIHo7XG4gICAgb3V0cHV0LnkgPSB0eSAqIHcgKyB5ICogdHcgKyB0eCAqIHogLSB4ICogdHo7XG4gICAgb3V0cHV0LnogPSB0eiAqIHcgKyB6ICogdHcgKyB4ICogdHkgLSB0eCAqIHk7XG4gICAgcmV0dXJuIG91dHB1dDtcbn07XG5cbi8qKlxuICogQ2xvbmUgdGhlIGlucHV0IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdiBUaGUgVmVjMyB0byBjbG9uZS5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSBUaGUgY2xvbmVkIFZlYzMuXG4gKi9cblZlYzMuY2xvbmUgPSBmdW5jdGlvbiBjbG9uZSh2KSB7XG4gICAgcmV0dXJuIG5ldyBWZWMzKHYueCwgdi55LCB2LnopO1xufTtcblxuLyoqXG4gKiBBZGQgdGhlIGlucHV0IFZlYzMncy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2MSBUaGUgbGVmdCBWZWMzLlxuICogQHBhcmFtIHtWZWMzfSB2MiBUaGUgcmlnaHQgVmVjMy5cbiAqIEBwYXJhbSB7VmVjM30gb3V0cHV0IFZlYzMgaW4gd2hpY2ggdG8gcGxhY2UgdGhlIHJlc3VsdC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSBUaGUgcmVzdWx0IG9mIHRoZSBhZGRpdGlvbi5cbiAqL1xuVmVjMy5hZGQgPSBmdW5jdGlvbiBhZGQodjEsIHYyLCBvdXRwdXQpIHtcbiAgICBvdXRwdXQueCA9IHYxLnggKyB2Mi54O1xuICAgIG91dHB1dC55ID0gdjEueSArIHYyLnk7XG4gICAgb3V0cHV0LnogPSB2MS56ICsgdjIuejtcbiAgICByZXR1cm4gb3V0cHV0O1xufTtcblxuLyoqXG4gKiBTdWJ0cmFjdCB0aGUgc2Vjb25kIFZlYzMgZnJvbSB0aGUgZmlyc3QuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdjEgVGhlIGxlZnQgVmVjMy5cbiAqIEBwYXJhbSB7VmVjM30gdjIgVGhlIHJpZ2h0IFZlYzMuXG4gKiBAcGFyYW0ge1ZlYzN9IG91dHB1dCBWZWMzIGluIHdoaWNoIHRvIHBsYWNlIHRoZSByZXN1bHQuXG4gKlxuICogQHJldHVybiB7VmVjM30gVGhlIHJlc3VsdCBvZiB0aGUgc3VidHJhY3Rpb24uXG4gKi9cblZlYzMuc3VidHJhY3QgPSBmdW5jdGlvbiBzdWJ0cmFjdCh2MSwgdjIsIG91dHB1dCkge1xuICAgIG91dHB1dC54ID0gdjEueCAtIHYyLng7XG4gICAgb3V0cHV0LnkgPSB2MS55IC0gdjIueTtcbiAgICBvdXRwdXQueiA9IHYxLnogLSB2Mi56O1xuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG4vKipcbiAqIFNjYWxlIHRoZSBpbnB1dCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzN9IHYgVGhlIHJlZmVyZW5jZSBWZWMzLlxuICogQHBhcmFtIHtOdW1iZXJ9IHMgTnVtYmVyIHRvIHNjYWxlIGJ5LlxuICogQHBhcmFtIHtWZWMzfSBvdXRwdXQgVmVjMyBpbiB3aGljaCB0byBwbGFjZSB0aGUgcmVzdWx0LlxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IFRoZSByZXN1bHQgb2YgdGhlIHNjYWxpbmcuXG4gKi9cblZlYzMuc2NhbGUgPSBmdW5jdGlvbiBzY2FsZSh2LCBzLCBvdXRwdXQpIHtcbiAgICBvdXRwdXQueCA9IHYueCAqIHM7XG4gICAgb3V0cHV0LnkgPSB2LnkgKiBzO1xuICAgIG91dHB1dC56ID0gdi56ICogcztcbiAgICByZXR1cm4gb3V0cHV0O1xufTtcblxuLyoqXG4gKiBUaGUgZG90IHByb2R1Y3Qgb2YgdGhlIGlucHV0IFZlYzMncy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2MSBUaGUgbGVmdCBWZWMzLlxuICogQHBhcmFtIHtWZWMzfSB2MiBUaGUgcmlnaHQgVmVjMy5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IFRoZSBkb3QgcHJvZHVjdC5cbiAqL1xuVmVjMy5kb3QgPSBmdW5jdGlvbiBkb3QodjEsIHYyKSB7XG4gICAgcmV0dXJuIHYxLnggKiB2Mi54ICsgdjEueSAqIHYyLnkgKyB2MS56ICogdjIuejtcbn07XG5cbi8qKlxuICogVGhlIChyaWdodC1oYW5kZWQpIGNyb3NzIHByb2R1Y3Qgb2YgdGhlIGlucHV0IFZlYzMncy5cbiAqIHYxIHggdjIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdjEgVGhlIGxlZnQgVmVjMy5cbiAqIEBwYXJhbSB7VmVjM30gdjIgVGhlIHJpZ2h0IFZlYzMuXG4gKiBAcGFyYW0ge1ZlYzN9IG91dHB1dCBWZWMzIGluIHdoaWNoIHRvIHBsYWNlIHRoZSByZXN1bHQuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSB0aGUgb2JqZWN0IHRoZSByZXN1bHQgb2YgdGhlIGNyb3NzIHByb2R1Y3Qgd2FzIHBsYWNlZCBpbnRvXG4gKi9cblZlYzMuY3Jvc3MgPSBmdW5jdGlvbiBjcm9zcyh2MSwgdjIsIG91dHB1dCkge1xuICAgIHZhciB4MSA9IHYxLng7XG4gICAgdmFyIHkxID0gdjEueTtcbiAgICB2YXIgejEgPSB2MS56O1xuICAgIHZhciB4MiA9IHYyLng7XG4gICAgdmFyIHkyID0gdjIueTtcbiAgICB2YXIgejIgPSB2Mi56O1xuXG4gICAgb3V0cHV0LnggPSB5MSAqIHoyIC0gejEgKiB5MjtcbiAgICBvdXRwdXQueSA9IHoxICogeDIgLSB4MSAqIHoyO1xuICAgIG91dHB1dC56ID0geDEgKiB5MiAtIHkxICogeDI7XG4gICAgcmV0dXJuIG91dHB1dDtcbn07XG5cbi8qKlxuICogVGhlIHByb2plY3Rpb24gb2YgdjEgb250byB2Mi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2MSBUaGUgbGVmdCBWZWMzLlxuICogQHBhcmFtIHtWZWMzfSB2MiBUaGUgcmlnaHQgVmVjMy5cbiAqIEBwYXJhbSB7VmVjM30gb3V0cHV0IFZlYzMgaW4gd2hpY2ggdG8gcGxhY2UgdGhlIHJlc3VsdC5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBvYmplY3QgdGhlIHJlc3VsdCBvZiB0aGUgY3Jvc3MgcHJvZHVjdCB3YXMgcGxhY2VkIGludG8gXG4gKi9cblZlYzMucHJvamVjdCA9IGZ1bmN0aW9uIHByb2plY3QodjEsIHYyLCBvdXRwdXQpIHtcbiAgICB2YXIgeDEgPSB2MS54O1xuICAgIHZhciB5MSA9IHYxLnk7XG4gICAgdmFyIHoxID0gdjEuejtcbiAgICB2YXIgeDIgPSB2Mi54O1xuICAgIHZhciB5MiA9IHYyLnk7XG4gICAgdmFyIHoyID0gdjIuejtcblxuICAgIHZhciBzY2FsZSA9IHgxICogeDIgKyB5MSAqIHkyICsgejEgKiB6MjtcbiAgICBzY2FsZSAvPSB4MiAqIHgyICsgeTIgKiB5MiArIHoyICogejI7XG5cbiAgICBvdXRwdXQueCA9IHgyICogc2NhbGU7XG4gICAgb3V0cHV0LnkgPSB5MiAqIHNjYWxlO1xuICAgIG91dHB1dC56ID0gejIgKiBzY2FsZTtcblxuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZlYzM7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IG5vb3BcblxuZnVuY3Rpb24gbm9vcCgpIHtcbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ1lvdSBzaG91bGQgYnVuZGxlIHlvdXIgY29kZSAnICtcbiAgICAgICd1c2luZyBgZ2xzbGlmeWAgYXMgYSB0cmFuc2Zvcm0uJ1xuICApXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHByb2dyYW1pZnlcblxuZnVuY3Rpb24gcHJvZ3JhbWlmeSh2ZXJ0ZXgsIGZyYWdtZW50LCB1bmlmb3JtcywgYXR0cmlidXRlcykge1xuICByZXR1cm4ge1xuICAgIHZlcnRleDogdmVydGV4LCBcbiAgICBmcmFnbWVudDogZnJhZ21lbnQsXG4gICAgdW5pZm9ybXM6IHVuaWZvcm1zLCBcbiAgICBhdHRyaWJ1dGVzOiBhdHRyaWJ1dGVzXG4gIH07XG59XG4iLCIvLyBodHRwOi8vcGF1bGlyaXNoLmNvbS8yMDExL3JlcXVlc3RhbmltYXRpb25mcmFtZS1mb3Itc21hcnQtYW5pbWF0aW5nL1xuLy8gaHR0cDovL215Lm9wZXJhLmNvbS9lbW9sbGVyL2Jsb2cvMjAxMS8xMi8yMC9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWVyLWFuaW1hdGluZ1xuLy8gcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHBvbHlmaWxsIGJ5IEVyaWsgTcO2bGxlci4gZml4ZXMgZnJvbSBQYXVsIElyaXNoIGFuZCBUaW5vIFppamRlbFxuLy8gTUlUIGxpY2Vuc2VcblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgbGFzdFRpbWUgPSAwO1xudmFyIHZlbmRvcnMgPSBbJ21zJywgJ21veicsICd3ZWJraXQnLCAnbyddO1xuXG52YXIgckFGLCBjQUY7XG5cbmlmICh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0Jykge1xuICAgIHJBRiA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG4gICAgY0FGID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5jYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG4gICAgZm9yICh2YXIgeCA9IDA7IHggPCB2ZW5kb3JzLmxlbmd0aCAmJiAhckFGOyArK3gpIHtcbiAgICAgICAgckFGID0gd2luZG93W3ZlbmRvcnNbeF0gKyAnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG4gICAgICAgIGNBRiA9IHdpbmRvd1t2ZW5kb3JzW3hdICsgJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddIHx8XG4gICAgICAgICAgICAgIHdpbmRvd1t2ZW5kb3JzW3hdICsgJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ107XG4gICAgfVxuXG4gICAgaWYgKHJBRiAmJiAhY0FGKSB7XG4gICAgICAgIC8vIGNBRiBub3Qgc3VwcG9ydGVkLlxuICAgICAgICAvLyBGYWxsIGJhY2sgdG8gc2V0SW50ZXJ2YWwgZm9yIG5vdyAodmVyeSByYXJlKS5cbiAgICAgICAgckFGID0gbnVsbDtcbiAgICB9XG59XG5cbmlmICghckFGKSB7XG4gICAgdmFyIG5vdyA9IERhdGUubm93ID8gRGF0ZS5ub3cgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICB9O1xuXG4gICAgckFGID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGN1cnJUaW1lID0gbm93KCk7XG4gICAgICAgIHZhciB0aW1lVG9DYWxsID0gTWF0aC5tYXgoMCwgMTYgLSAoY3VyclRpbWUgLSBsYXN0VGltZSkpO1xuICAgICAgICB2YXIgaWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGN1cnJUaW1lICsgdGltZVRvQ2FsbCk7XG4gICAgICAgIH0sIHRpbWVUb0NhbGwpO1xuICAgICAgICBsYXN0VGltZSA9IGN1cnJUaW1lICsgdGltZVRvQ2FsbDtcbiAgICAgICAgcmV0dXJuIGlkO1xuICAgIH07XG5cbiAgICBjQUYgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGlkKTtcbiAgICB9O1xufVxuXG52YXIgYW5pbWF0aW9uRnJhbWUgPSB7XG4gICAgLyoqXG4gICAgICogQ3Jvc3MgYnJvd3NlciB2ZXJzaW9uIG9mIFtyZXF1ZXN0QW5pbWF0aW9uRnJhbWVde0BsaW5rIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS93aW5kb3cvcmVxdWVzdEFuaW1hdGlvbkZyYW1lfS5cbiAgICAgKlxuICAgICAqIFVzZWQgYnkgRW5naW5lIGluIG9yZGVyIHRvIGVzdGFibGlzaCBhIHJlbmRlciBsb29wLlxuICAgICAqXG4gICAgICogSWYgbm8gKHZlbmRvciBwcmVmaXhlZCB2ZXJzaW9uIG9mKSBgcmVxdWVzdEFuaW1hdGlvbkZyYW1lYCBpcyBhdmFpbGFibGUsXG4gICAgICogYHNldFRpbWVvdXRgIHdpbGwgYmUgdXNlZCBpbiBvcmRlciB0byBlbXVsYXRlIGEgcmVuZGVyIGxvb3AgcnVubmluZyBhdFxuICAgICAqIGFwcHJveGltYXRlbHkgNjAgZnJhbWVzIHBlciBzZWNvbmQuXG4gICAgICpcbiAgICAgKiBAbWV0aG9kICByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgICAgKlxuICAgICAqIEBwYXJhbSAgIHtGdW5jdGlvbn0gIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGludm9rZWQgb24gdGhlIG5leHQgZnJhbWUuXG4gICAgICogQHJldHVybiAge051bWJlcn0gICAgcmVxdWVzdElkIHRvIGJlIHVzZWQgdG8gY2FuY2VsIHRoZSByZXF1ZXN0IHVzaW5nXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgQGxpbmt7Y2FuY2VsQW5pbWF0aW9uRnJhbWV9LlxuICAgICAqL1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZTogckFGLFxuXG4gICAgLyoqXG4gICAgICogQ3Jvc3MgYnJvd3NlciB2ZXJzaW9uIG9mIFtjYW5jZWxBbmltYXRpb25GcmFtZV17QGxpbmsgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL3dpbmRvdy9jYW5jZWxBbmltYXRpb25GcmFtZX0uXG4gICAgICpcbiAgICAgKiBDYW5jZWxzIGEgcHJldmlvdXNseSB1c2luZyBbcmVxdWVzdEFuaW1hdGlvbkZyYW1lXXtAbGluayBhbmltYXRpb25GcmFtZSNyZXF1ZXN0QW5pbWF0aW9uRnJhbWV9XG4gICAgICogc2NoZWR1bGVkIHJlcXVlc3QuXG4gICAgICpcbiAgICAgKiBVc2VkIGZvciBpbW1lZGlhdGVseSBzdG9wcGluZyB0aGUgcmVuZGVyIGxvb3Agd2l0aGluIHRoZSBFbmdpbmUuXG4gICAgICpcbiAgICAgKiBAbWV0aG9kICBjYW5jZWxBbmltYXRpb25GcmFtZVxuICAgICAqXG4gICAgICogQHBhcmFtICAge051bWJlcn0gICAgcmVxdWVzdElkIG9mIHRoZSBzY2hlZHVsZWQgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICByZXR1cm5lZCBieSBbcmVxdWVzdEFuaW1hdGlvbkZyYW1lXXtAbGluayBhbmltYXRpb25GcmFtZSNyZXF1ZXN0QW5pbWF0aW9uRnJhbWV9LlxuICAgICAqL1xuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lOiBjQUZcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYW5pbWF0aW9uRnJhbWU7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICogXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICogXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKiBcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqIFxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWU6IHJlcXVpcmUoJy4vYW5pbWF0aW9uRnJhbWUnKS5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUsXG4gICAgY2FuY2VsQW5pbWF0aW9uRnJhbWU6IHJlcXVpcmUoJy4vYW5pbWF0aW9uRnJhbWUnKS5jYW5jZWxBbmltYXRpb25GcmFtZVxufTtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKiBcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKiBcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqIFxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICogXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBwb2x5ZmlsbHMgPSByZXF1aXJlKCcuLi9wb2x5ZmlsbHMnKTtcbnZhciByQUYgPSBwb2x5ZmlsbHMucmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xudmFyIGNBRiA9IHBvbHlmaWxscy5jYW5jZWxBbmltYXRpb25GcmFtZTtcblxuLyoqXG4gKiBCb29sZWFuIGNvbnN0YW50IGluZGljYXRpbmcgd2hldGhlciB0aGUgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCBoYXMgYWNjZXNzIHRvIHRoZSBkb2N1bWVudC5cbiAqIFRoZSBkb2N1bWVudCBpcyBiZWluZyB1c2VkIGluIG9yZGVyIHRvIHN1YnNjcmliZSBmb3IgdmlzaWJpbGl0eWNoYW5nZSBldmVudHNcbiAqIHVzZWQgZm9yIG5vcm1hbGl6aW5nIHRoZSBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wIHRpbWUgd2hlbiBlLmcuIHdoZW4gc3dpdGNoaW5nIHRhYnMuXG4gKiBcbiAqIEBjb25zdGFudFxuICogQHR5cGUge0Jvb2xlYW59XG4gKi8gXG52YXIgRE9DVU1FTlRfQUNDRVNTID0gdHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJztcblxuaWYgKERPQ1VNRU5UX0FDQ0VTUykge1xuICAgIHZhciBWRU5ET1JfSElEREVOLCBWRU5ET1JfVklTSUJJTElUWV9DSEFOR0U7XG5cbiAgICAvLyBPcGVyYSAxMi4xMCBhbmQgRmlyZWZveCAxOCBhbmQgbGF0ZXIgc3VwcG9ydFxuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQuaGlkZGVuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBWRU5ET1JfSElEREVOID0gJ2hpZGRlbic7XG4gICAgICAgIFZFTkRPUl9WSVNJQklMSVRZX0NIQU5HRSA9ICd2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50Lm1vekhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgVkVORE9SX0hJRERFTiA9ICdtb3pIaWRkZW4nO1xuICAgICAgICBWRU5ET1JfVklTSUJJTElUWV9DSEFOR0UgPSAnbW96dmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5tc0hpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgVkVORE9SX0hJRERFTiA9ICdtc0hpZGRlbic7XG4gICAgICAgIFZFTkRPUl9WSVNJQklMSVRZX0NIQU5HRSA9ICdtc3Zpc2liaWxpdHljaGFuZ2UnO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQud2Via2l0SGlkZGVuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBWRU5ET1JfSElEREVOID0gJ3dlYmtpdEhpZGRlbic7XG4gICAgICAgIFZFTkRPUl9WSVNJQklMSVRZX0NIQU5HRSA9ICd3ZWJraXR2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG59XG5cbi8qKlxuICogUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCBjbGFzcyB1c2VkIGZvciB1cGRhdGluZyBvYmplY3RzIG9uIGEgZnJhbWUtYnktZnJhbWUuIFN5bmNocm9uaXplcyB0aGVcbiAqIGB1cGRhdGVgIG1ldGhvZCBpbnZvY2F0aW9ucyB0byB0aGUgcmVmcmVzaCByYXRlIG9mIHRoZSBzY3JlZW4uIE1hbmFnZXNcbiAqIHRoZSBgcmVxdWVzdEFuaW1hdGlvbkZyYW1lYC1sb29wIGJ5IG5vcm1hbGl6aW5nIHRoZSBwYXNzZWQgaW4gdGltZXN0YW1wXG4gKiB3aGVuIHN3aXRjaGluZyB0YWJzLlxuICogXG4gKiBAY2xhc3MgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcFxuICovXG5mdW5jdGlvbiBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgXG4gICAgLy8gUmVmZXJlbmNlcyB0byBvYmplY3RzIHRvIGJlIHVwZGF0ZWQgb24gbmV4dCBmcmFtZS5cbiAgICB0aGlzLl91cGRhdGVzID0gW107XG4gICAgXG4gICAgdGhpcy5fbG9vcGVyID0gZnVuY3Rpb24odGltZSkge1xuICAgICAgICBfdGhpcy5sb29wKHRpbWUpO1xuICAgIH07XG4gICAgdGhpcy5fdGltZSA9IDA7XG4gICAgdGhpcy5fc3RvcHBlZEF0ID0gMDtcbiAgICB0aGlzLl9zbGVlcCA9IDA7XG4gICAgXG4gICAgLy8gSW5kaWNhdGVzIHdoZXRoZXIgdGhlIGVuZ2luZSBzaG91bGQgYmUgcmVzdGFydGVkIHdoZW4gdGhlIHRhYi8gd2luZG93IGlzXG4gICAgLy8gYmVpbmcgZm9jdXNlZCBhZ2FpbiAodmlzaWJpbGl0eSBjaGFuZ2UpLlxuICAgIHRoaXMuX3N0YXJ0T25WaXNpYmlsaXR5Q2hhbmdlID0gdHJ1ZTtcbiAgICBcbiAgICAvLyByZXF1ZXN0SWQgYXMgcmV0dXJuZWQgYnkgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIGZ1bmN0aW9uO1xuICAgIHRoaXMuX3JBRiA9IG51bGw7XG4gICAgXG4gICAgdGhpcy5fc2xlZXBEaWZmID0gdHJ1ZTtcbiAgICBcbiAgICAvLyBUaGUgZW5naW5lIGlzIGJlaW5nIHN0YXJ0ZWQgb24gaW5zdGFudGlhdGlvbi5cbiAgICAvLyBUT0RPKGFsZXhhbmRlckd1Z2VsKVxuICAgIHRoaXMuc3RhcnQoKTtcblxuICAgIC8vIFRoZSBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wIHN1cHBvcnRzIHJ1bm5pbmcgaW4gYSBub24tYnJvd3NlciBlbnZpcm9ubWVudCAoZS5nLiBXb3JrZXIpLlxuICAgIGlmIChET0NVTUVOVF9BQ0NFU1MpIHtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihWRU5ET1JfVklTSUJJTElUWV9DSEFOR0UsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMuX29uVmlzaWJpbGl0eUNoYW5nZSgpO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbi8qKlxuICogSGFuZGxlIHRoZSBzd2l0Y2hpbmcgb2YgdGFicy5cbiAqXG4gKiBAbWV0aG9kXG4gKiBfcHJpdmF0ZVxuICogXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5fb25WaXNpYmlsaXR5Q2hhbmdlID0gZnVuY3Rpb24gX29uVmlzaWJpbGl0eUNoYW5nZSgpIHtcbiAgICBpZiAoZG9jdW1lbnRbVkVORE9SX0hJRERFTl0pIHtcbiAgICAgICAgdGhpcy5fb25VbmZvY3VzKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9vbkZvY3VzKCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBoZWxwZXIgZnVuY3Rpb24gdG8gYmUgaW52b2tlZCBhcyBzb29uIGFzIHRoZSB3aW5kb3cvIHRhYiBpcyBiZWluZ1xuICogZm9jdXNlZCBhZnRlciBhIHZpc2liaWx0aXkgY2hhbmdlLlxuICogXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi8gXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5fb25Gb2N1cyA9IGZ1bmN0aW9uIF9vbkZvY3VzKCkge1xuICAgIGlmICh0aGlzLl9zdGFydE9uVmlzaWJpbGl0eUNoYW5nZSkge1xuICAgICAgICB0aGlzLl9zdGFydCgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIGZ1bmN0aW9uIHRvIGJlIGludm9rZWQgYXMgc29vbiBhcyB0aGUgd2luZG93LyB0YWIgaXMgYmVpbmdcbiAqIHVuZm9jdXNlZCAoaGlkZGVuKSBhZnRlciBhIHZpc2liaWx0aXkgY2hhbmdlLlxuICogXG4gKiBAbWV0aG9kICBfb25Gb2N1c1xuICogQHByaXZhdGVcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovIFxuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUuX29uVW5mb2N1cyA9IGZ1bmN0aW9uIF9vblVuZm9jdXMoKSB7XG4gICAgdGhpcy5fc3RvcCgpO1xufTtcblxuLyoqXG4gKiBTdGFydHMgdGhlIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AuIFdoZW4gc3dpdGNoaW5nIHRvIGEgZGlmZmVybnQgdGFiLyB3aW5kb3cgKGNoYW5naW5nIHRoZVxuICogdmlzaWJpbHRpeSksIHRoZSBlbmdpbmUgd2lsbCBiZSByZXRhcnRlZCB3aGVuIHN3aXRjaGluZyBiYWNrIHRvIGEgdmlzaWJsZVxuICogc3RhdGUuXG4gKlxuICogQG1ldGhvZFxuICogXG4gKiBAcmV0dXJuIHtSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wfSB0aGlzXG4gKi9cblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgaWYgKCF0aGlzLl9ydW5uaW5nKSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0T25WaXNpYmlsaXR5Q2hhbmdlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fc3RhcnQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEludGVybmFsIHZlcnNpb24gb2YgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCdzIHN0YXJ0IGZ1bmN0aW9uLCBub3QgYWZmZWN0aW5nIGJlaGF2aW9yIG9uIHZpc2liaWx0eVxuICogY2hhbmdlLlxuICogXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqLyBcblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIF9zdGFydCgpIHtcbiAgICB0aGlzLl9ydW5uaW5nID0gdHJ1ZTtcbiAgICB0aGlzLl9zbGVlcERpZmYgPSB0cnVlO1xuICAgIHRoaXMuX3JBRiA9IHJBRih0aGlzLl9sb29wZXIpO1xufTtcblxuLyoqXG4gKiBTdG9wcyB0aGUgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBcbiAqIEByZXR1cm4ge1JlcXVlc3RBbmltYXRpb25GcmFtZUxvb3B9IHRoaXNcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uIHN0b3AoKSB7XG4gICAgaWYgKHRoaXMuX3J1bm5pbmcpIHtcbiAgICAgICAgdGhpcy5fc3RhcnRPblZpc2liaWxpdHlDaGFuZ2UgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fc3RvcCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogSW50ZXJuYWwgdmVyc2lvbiBvZiBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wJ3Mgc3RvcCBmdW5jdGlvbiwgbm90IGFmZmVjdGluZyBiZWhhdmlvciBvbiB2aXNpYmlsdHlcbiAqIGNoYW5nZS5cbiAqIFxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovIFxuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiBfc3RvcCgpIHtcbiAgICB0aGlzLl9ydW5uaW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc3RvcHBlZEF0ID0gdGhpcy5fdGltZTtcblxuICAgIC8vIEJ1ZyBpbiBvbGQgdmVyc2lvbnMgb2YgRnguIEV4cGxpY2l0bHkgY2FuY2VsLlxuICAgIGNBRih0aGlzLl9yQUYpO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AgaXMgY3VycmVudGx5IHJ1bm5pbmcgb3Igbm90LlxuICpcbiAqIEBtZXRob2RcbiAqIFxuICogQHJldHVybiB7Qm9vbGVhbn0gYm9vbGVhbiB2YWx1ZSBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AgaXMgY3VycmVudGx5IHJ1bm5pbmcgb3Igbm90XG4gKi9cblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLmlzUnVubmluZyA9IGZ1bmN0aW9uIGlzUnVubmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5fcnVubmluZztcbn07XG5cbi8qKlxuICogVXBkYXRlcyBhbGwgcmVnaXN0ZXJlZCBvYmplY3RzLlxuICpcbiAqIEBtZXRob2RcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IHRpbWUgaGlnaCByZXNvbHV0aW9uIHRpbXN0YW1wIHVzZWQgZm9yIGludm9raW5nIHRoZSBgdXBkYXRlYCBtZXRob2Qgb24gYWxsIHJlZ2lzdGVyZWQgb2JqZWN0c1xuICpcbiAqIEByZXR1cm4ge1JlcXVlc3RBbmltYXRpb25GcmFtZUxvb3B9IHRoaXNcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUuc3RlcCA9IGZ1bmN0aW9uIHN0ZXAgKHRpbWUpIHtcbiAgICB0aGlzLl90aW1lID0gdGltZTtcbiAgICBpZiAodGhpcy5fc2xlZXBEaWZmKSB7XG4gICAgICAgIHRoaXMuX3NsZWVwICs9IHRpbWUgLSB0aGlzLl9zdG9wcGVkQXQ7XG4gICAgICAgIHRoaXMuX3NsZWVwRGlmZiA9IGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICAvLyBUaGUgc2FtZSB0aW1ldGFtcCB3aWxsIGJlIGVtaXR0ZWQgaW1tZWRpYXRlbHkgYmVmb3JlIGFuZCBhZnRlciB2aXNpYmlsaXR5XG4gICAgLy8gY2hhbmdlLlxuICAgIHZhciBub3JtYWxpemVkVGltZSA9IHRpbWUgLSB0aGlzLl9zbGVlcDtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5fdXBkYXRlcy5sZW5ndGggOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZXNbaV0udXBkYXRlKG5vcm1hbGl6ZWRUaW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIE1ldGhvZCBiZWluZyBjYWxsZWQgYnkgYHJlcXVlc3RBbmltYXRpb25GcmFtZWAgb24gZXZlcnkgcGFpbnQuIEluZGlyZWN0bHlcbiAqIHJlY3Vyc2l2ZSBieSBzY2hlZHVsaW5nIGEgZnV0dXJlIGludm9jYXRpb24gb2YgaXRzZWxmIG9uIHRoZSBuZXh0IHBhaW50LlxuICpcbiAqIEBtZXRob2RcbiAqIFxuICogQHBhcmFtIHtOdW1iZXJ9IHRpbWUgaGlnaCByZXNvbHV0aW9uIHRpbXN0YW1wIHVzZWQgZm9yIGludm9raW5nIHRoZSBgdXBkYXRlYCBtZXRob2Qgb24gYWxsIHJlZ2lzdGVyZWQgb2JqZWN0c1xuICogQHJldHVybiB7UmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcH0gdGhpc1xuICovXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5sb29wID0gZnVuY3Rpb24gbG9vcCh0aW1lKSB7XG4gICAgdGhpcy5zdGVwKHRpbWUpO1xuICAgIHRoaXMuX3JBRiA9IHJBRih0aGlzLl9sb29wZXIpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlcmVzIGFuIHVwZGF0ZWFibGUgb2JqZWN0IHdoaWNoIGB1cGRhdGVgIG1ldGhvZCBzaG91bGQgYmUgaW52b2tlZCBvblxuICogZXZlcnkgcGFpbnQsIHN0YXJ0aW5nIG9uIHRoZSBuZXh0IHBhaW50IChhc3N1bWluZyB0aGUgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCBpcyBydW5uaW5nKS5cbiAqXG4gKiBAbWV0aG9kXG4gKiBcbiAqIEBwYXJhbSB7T2JqZWN0fSB1cGRhdGVhYmxlIG9iamVjdCB0byBiZSB1cGRhdGVkXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB1cGRhdGVhYmxlLnVwZGF0ZSB1cGRhdGUgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIG9uIHRoZSByZWdpc3RlcmVkIG9iamVjdFxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3RBbmltYXRpb25GcmFtZUxvb3B9IHRoaXNcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKHVwZGF0ZWFibGUpIHtcbiAgICBpZiAodGhpcy5fdXBkYXRlcy5pbmRleE9mKHVwZGF0ZWFibGUpID09PSAtMSkge1xuICAgICAgICB0aGlzLl91cGRhdGVzLnB1c2godXBkYXRlYWJsZSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEZXJlZ2lzdGVycyBhbiB1cGRhdGVhYmxlIG9iamVjdCBwcmV2aW91c2x5IHJlZ2lzdGVyZWQgdXNpbmcgYHVwZGF0ZWAgdG8gYmVcbiAqIG5vIGxvbmdlciB1cGRhdGVkLlxuICpcbiAqIEBtZXRob2RcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IHVwZGF0ZWFibGUgdXBkYXRlYWJsZSBvYmplY3QgcHJldmlvdXNseSByZWdpc3RlcmVkIHVzaW5nIGB1cGRhdGVgXG4gKlxuICogQHJldHVybiB7UmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcH0gdGhpc1xuICovXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5ub0xvbmdlclVwZGF0ZSA9IGZ1bmN0aW9uIG5vTG9uZ2VyVXBkYXRlKHVwZGF0ZWFibGUpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl91cGRhdGVzLmluZGV4T2YodXBkYXRlYWJsZSk7XG4gICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIENvbnRleHQgPSByZXF1aXJlKCcuL0NvbnRleHQnKTtcbnZhciBpbmplY3RDU1MgPSByZXF1aXJlKCcuL2luamVjdC1jc3MnKTtcblxuLyoqXG4gKiBJbnN0YW50aWF0ZXMgYSBuZXcgQ29tcG9zaXRvci5cbiAqIFRoZSBDb21wb3NpdG9yIHJlY2VpdmVzIGRyYXcgY29tbWFuZHMgZnJtIHRoZSBVSU1hbmFnZXIgYW5kIHJvdXRlcyB0aGUgdG8gdGhlXG4gKiByZXNwZWN0aXZlIGNvbnRleHQgb2JqZWN0cy5cbiAqXG4gKiBVcG9uIGNyZWF0aW9uLCBpdCBpbmplY3RzIGEgc3R5bGVzaGVldCB1c2VkIGZvciBzdHlsaW5nIHRoZSBpbmRpdmlkdWFsXG4gKiByZW5kZXJlcnMgdXNlZCBpbiB0aGUgY29udGV4dCBvYmplY3RzLlxuICpcbiAqIEBjbGFzcyBDb21wb3NpdG9yXG4gKiBAY29uc3RydWN0b3JcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbmZ1bmN0aW9uIENvbXBvc2l0b3IoKSB7XG4gICAgaW5qZWN0Q1NTKCk7XG5cbiAgICB0aGlzLl9jb250ZXh0cyA9IHt9O1xuICAgIHRoaXMuX291dENvbW1hbmRzID0gW107XG4gICAgdGhpcy5faW5Db21tYW5kcyA9IFtdO1xuICAgIHRoaXMuX3RpbWUgPSBudWxsO1xuXG4gICAgdGhpcy5fcmVzaXplZCA9IGZhbHNlO1xuXG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLl9yZXNpemVkID0gdHJ1ZTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhlIHRpbWUgYmVpbmcgdXNlZCBieSB0aGUgaW50ZXJuYWwgY2xvY2sgbWFuYWdlZCBieVxuICogYEZhbW91c0VuZ2luZWAuXG4gKlxuICogVGhlIHRpbWUgaXMgYmVpbmcgcGFzc2VkIGludG8gY29yZSBieSB0aGUgRW5naW5lIHRocm91Z2ggdGhlIFVJTWFuYWdlci5cbiAqIFNpbmNlIGNvcmUgaGFzIHRoZSBhYmlsaXR5IHRvIHNjYWxlIHRoZSB0aW1lLCB0aGUgdGltZSBuZWVkcyB0byBiZSBwYXNzZWRcbiAqIGJhY2sgdG8gdGhlIHJlbmRlcmluZyBzeXN0ZW0uXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdGltZSBUaGUgY2xvY2sgdGltZSB1c2VkIGluIGNvcmUuXG4gKi9cbkNvbXBvc2l0b3IucHJvdG90eXBlLmdldFRpbWUgPSBmdW5jdGlvbiBnZXRUaW1lKCkge1xuICAgIHJldHVybiB0aGlzLl90aW1lO1xufTtcblxuLyoqXG4gKiBTY2hlZHVsZXMgYW4gZXZlbnQgdG8gYmUgc2VudCB0aGUgbmV4dCB0aW1lIHRoZSBvdXQgY29tbWFuZCBxdWV1ZSBpcyBiZWluZ1xuICogZmx1c2hlZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gcGF0aCBSZW5kZXIgcGF0aCB0byB0aGUgbm9kZSB0aGUgZXZlbnQgc2hvdWxkIGJlIHRyaWdnZXJlZFxuICogb24gKCp0YXJnZXRlZCBldmVudCopXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGV2IEV2ZW50IHR5cGVcbiAqIEBwYXJhbSAge09iamVjdH0gcGF5bG9hZCBFdmVudCBvYmplY3QgKHNlcmlhbGl6YWJsZSB1c2luZyBzdHJ1Y3R1cmVkIGNsb25pbmdcbiAqIGFsZ29yaXRobSlcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS5zZW5kRXZlbnQgPSBmdW5jdGlvbiBzZW5kRXZlbnQocGF0aCwgZXYsIHBheWxvYWQpIHtcbiAgICB0aGlzLl9vdXRDb21tYW5kcy5wdXNoKCdXSVRIJywgcGF0aCwgJ1RSSUdHRVInLCBldiwgcGF5bG9hZCk7XG59O1xuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBtZXRob2QgdXNlZCBmb3Igbm90aWZ5aW5nIGV4dGVybmFsbHlcbiAqIHJlc2l6ZWQgY29udGV4dHMgKGUuZy4gYnkgcmVzaXppbmcgdGhlIGJyb3dzZXIgd2luZG93KS5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gc2VsZWN0b3IgcmVuZGVyIHBhdGggdG8gdGhlIG5vZGUgKGNvbnRleHQpIHRoYXQgc2hvdWxkIGJlXG4gKiByZXNpemVkXG4gKiBAcGFyYW0gIHtBcnJheX0gc2l6ZSBuZXcgY29udGV4dCBzaXplXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29tcG9zaXRvci5wcm90b3R5cGUuc2VuZFJlc2l6ZSA9IGZ1bmN0aW9uIHNlbmRSZXNpemUgKHNlbGVjdG9yLCBzaXplKSB7XG4gICAgdGhpcy5zZW5kRXZlbnQoc2VsZWN0b3IsICdDT05URVhUX1JFU0laRScsIHNpemUpO1xufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBoZWxwZXIgbWV0aG9kIHVzZWQgYnkgYGRyYXdDb21tYW5kc2AuXG4gKiBTdWJzZXF1ZW50IGNvbW1hbmRzIGFyZSBiZWluZyBhc3NvY2lhdGVkIHdpdGggdGhlIG5vZGUgZGVmaW5lZCB0aGUgdGhlIHBhdGhcbiAqIGZvbGxvd2luZyB0aGUgYFdJVEhgIGNvbW1hbmQuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGl0ZXJhdG9yIHBvc2l0aW9uIGluZGV4IHdpdGhpbiB0aGUgY29tbWFuZHMgcXVldWVcbiAqIEBwYXJhbSAge0FycmF5fSBjb21tYW5kcyByZW1haW5pbmcgbWVzc2FnZSBxdWV1ZSByZWNlaXZlZCwgdXNlZCB0b1xuICogc2hpZnQgc2luZ2xlIG1lc3NhZ2VzIGZyb21cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS5oYW5kbGVXaXRoID0gZnVuY3Rpb24gaGFuZGxlV2l0aCAoaXRlcmF0b3IsIGNvbW1hbmRzKSB7XG4gICAgdmFyIHBhdGggPSBjb21tYW5kc1tpdGVyYXRvcl07XG4gICAgdmFyIHBhdGhBcnIgPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgdmFyIGNvbnRleHQgPSB0aGlzLmdldE9yU2V0Q29udGV4dChwYXRoQXJyLnNoaWZ0KCkpO1xuICAgIHJldHVybiBjb250ZXh0LnJlY2VpdmUocGF0aCwgY29tbWFuZHMsIGl0ZXJhdG9yKTtcbn07XG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSB0b3AtbGV2ZWwgQ29udGV4dCBhc3NvY2lhdGVkIHdpdGggdGhlIHBhc3NlZCBpbiBkb2N1bWVudFxuICogcXVlcnkgc2VsZWN0b3IuIElmIG5vIHN1Y2ggQ29udGV4dCBleGlzdHMsIGEgbmV3IG9uZSB3aWxsIGJlIGluc3RhbnRpYXRlZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gc2VsZWN0b3IgZG9jdW1lbnQgcXVlcnkgc2VsZWN0b3IgdXNlZCBmb3IgcmV0cmlldmluZyB0aGVcbiAqIERPTSBub2RlIHRoZSBWaXJ0dWFsRWxlbWVudCBzaG91bGQgYmUgYXR0YWNoZWQgdG9cbiAqXG4gKiBAcmV0dXJuIHtDb250ZXh0fSBjb250ZXh0XG4gKi9cbkNvbXBvc2l0b3IucHJvdG90eXBlLmdldE9yU2V0Q29udGV4dCA9IGZ1bmN0aW9uIGdldE9yU2V0Q29udGV4dChzZWxlY3Rvcikge1xuICAgIGlmICh0aGlzLl9jb250ZXh0c1tzZWxlY3Rvcl0pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHRzW3NlbGVjdG9yXTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBjb250ZXh0ID0gbmV3IENvbnRleHQoc2VsZWN0b3IsIHRoaXMpO1xuICAgICAgICB0aGlzLl9jb250ZXh0c1tzZWxlY3Rvcl0gPSBjb250ZXh0O1xuICAgICAgICByZXR1cm4gY29udGV4dDtcbiAgICB9XG59O1xuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBtZXRob2QgdXNlZCBieSBgZHJhd0NvbW1hbmRzYC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSAge051bWJlcn0gaXRlcmF0b3IgcG9zaXRpb24gaW5kZXggd2l0aGluIHRoZSBjb21tYW5kIHF1ZXVlXG4gKiBAcGFyYW0gIHtBcnJheX0gY29tbWFuZHMgcmVtYWluaW5nIG1lc3NhZ2UgcXVldWUgcmVjZWl2ZWQsIHVzZWQgdG9cbiAqIHNoaWZ0IHNpbmdsZSBtZXNzYWdlc1xuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNvbXBvc2l0b3IucHJvdG90eXBlLmdpdmVTaXplRm9yID0gZnVuY3Rpb24gZ2l2ZVNpemVGb3IoaXRlcmF0b3IsIGNvbW1hbmRzKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gY29tbWFuZHNbaXRlcmF0b3JdO1xuICAgIHZhciBzaXplID0gdGhpcy5nZXRPclNldENvbnRleHQoc2VsZWN0b3IpLmdldFJvb3RTaXplKCk7XG4gICAgdGhpcy5zZW5kUmVzaXplKHNlbGVjdG9yLCBzaXplKTtcbn07XG5cbi8qKlxuICogUHJvY2Vzc2VzIHRoZSBwcmV2aW91c2x5IHZpYSBgcmVjZWl2ZUNvbW1hbmRzYCB1cGRhdGVkIGluY29taW5nIFwiaW5cIlxuICogY29tbWFuZCBxdWV1ZS5cbiAqIENhbGxlZCBieSBVSU1hbmFnZXIgb24gYSBmcmFtZSBieSBmcmFtZSBiYXNpcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7QXJyYXl9IG91dENvbW1hbmRzIHNldCBvZiBjb21tYW5kcyB0byBiZSBzZW50IGJhY2tcbiAqL1xuQ29tcG9zaXRvci5wcm90b3R5cGUuZHJhd0NvbW1hbmRzID0gZnVuY3Rpb24gZHJhd0NvbW1hbmRzKCkge1xuICAgIHZhciBjb21tYW5kcyA9IHRoaXMuX2luQ29tbWFuZHM7XG4gICAgdmFyIGxvY2FsSXRlcmF0b3IgPSAwO1xuICAgIHZhciBjb21tYW5kID0gY29tbWFuZHNbbG9jYWxJdGVyYXRvcl07XG4gICAgd2hpbGUgKGNvbW1hbmQpIHtcbiAgICAgICAgc3dpdGNoIChjb21tYW5kKSB7XG4gICAgICAgICAgICBjYXNlICdUSU1FJzpcbiAgICAgICAgICAgICAgICB0aGlzLl90aW1lID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ1dJVEgnOlxuICAgICAgICAgICAgICAgIGxvY2FsSXRlcmF0b3IgPSB0aGlzLmhhbmRsZVdpdGgoKytsb2NhbEl0ZXJhdG9yLCBjb21tYW5kcyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdORUVEX1NJWkVfRk9SJzpcbiAgICAgICAgICAgICAgICB0aGlzLmdpdmVTaXplRm9yKCsrbG9jYWxJdGVyYXRvciwgY29tbWFuZHMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNvbW1hbmQgPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgIH1cblxuICAgIC8vIFRPRE86IFN3aXRjaCB0byBhc3NvY2lhdGl2ZSBhcnJheXMgaGVyZS4uLlxuXG4gICAgZm9yICh2YXIga2V5IGluIHRoaXMuX2NvbnRleHRzKSB7XG4gICAgICAgIHRoaXMuX2NvbnRleHRzW2tleV0uZHJhdygpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9yZXNpemVkKSB7XG4gICAgICAgIHRoaXMudXBkYXRlU2l6ZSgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9vdXRDb21tYW5kcztcbn07XG5cblxuLyoqXG4gKiBVcGRhdGVzIHRoZSBzaXplIG9mIGFsbCBwcmV2aW91c2x5IHJlZ2lzdGVyZWQgY29udGV4dCBvYmplY3RzLlxuICogVGhpcyByZXN1bHRzIGludG8gQ09OVEVYVF9SRVNJWkUgZXZlbnRzIGJlaW5nIHNlbnQgYW5kIHRoZSByb290IGVsZW1lbnRzXG4gKiB1c2VkIGJ5IHRoZSBpbmRpdmlkdWFsIHJlbmRlcmVycyBiZWluZyByZXNpemVkIHRvIHRoZSB0aGUgRE9NUmVuZGVyZXIncyByb290XG4gKiBzaXplLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS51cGRhdGVTaXplID0gZnVuY3Rpb24gdXBkYXRlU2l6ZSgpIHtcbiAgICBmb3IgKHZhciBzZWxlY3RvciBpbiB0aGlzLl9jb250ZXh0cykge1xuICAgICAgICB0aGlzLl9jb250ZXh0c1tzZWxlY3Rvcl0udXBkYXRlU2l6ZSgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogVXNlZCBieSBUaHJlYWRNYW5hZ2VyIHRvIHVwZGF0ZSB0aGUgaW50ZXJuYWwgcXVldWUgb2YgaW5jb21pbmcgY29tbWFuZHMuXG4gKiBSZWNlaXZpbmcgY29tbWFuZHMgZG9lcyBub3QgaW1tZWRpYXRlbHkgc3RhcnQgdGhlIHJlbmRlcmluZyBwcm9jZXNzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0gIHtBcnJheX0gY29tbWFuZHMgY29tbWFuZCBxdWV1ZSB0byBiZSBwcm9jZXNzZWQgYnkgdGhlIGNvbXBvc2l0b3Inc1xuICogYGRyYXdDb21tYW5kc2AgbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29tcG9zaXRvci5wcm90b3R5cGUucmVjZWl2ZUNvbW1hbmRzID0gZnVuY3Rpb24gcmVjZWl2ZUNvbW1hbmRzKGNvbW1hbmRzKSB7XG4gICAgdmFyIGxlbiA9IGNvbW1hbmRzLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHRoaXMuX2luQ29tbWFuZHMucHVzaChjb21tYW5kc1tpXSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBGbHVzaGVzIHRoZSBxdWV1ZSBvZiBvdXRnb2luZyBcIm91dFwiIGNvbW1hbmRzLlxuICogQ2FsbGVkIGJ5IFRocmVhZE1hbmFnZXIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNvbXBvc2l0b3IucHJvdG90eXBlLmNsZWFyQ29tbWFuZHMgPSBmdW5jdGlvbiBjbGVhckNvbW1hbmRzKCkge1xuICAgIHRoaXMuX2luQ29tbWFuZHMubGVuZ3RoID0gMDtcbiAgICB0aGlzLl9vdXRDb21tYW5kcy5sZW5ndGggPSAwO1xuICAgIHRoaXMuX3Jlc2l6ZWQgPSBmYWxzZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9zaXRvcjtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFdlYkdMUmVuZGVyZXIgPSByZXF1aXJlKCcuLi93ZWJnbC1yZW5kZXJlcnMvV2ViR0xSZW5kZXJlcicpO1xudmFyIENhbWVyYSA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudHMvQ2FtZXJhJyk7XG52YXIgRE9NUmVuZGVyZXIgPSByZXF1aXJlKCcuLi9kb20tcmVuZGVyZXJzL0RPTVJlbmRlcmVyJyk7XG5cbi8qKlxuICogQ29udGV4dCBpcyBhIHJlbmRlciBsYXllciB3aXRoIGl0cyBvd24gV2ViR0xSZW5kZXJlciBhbmQgRE9NUmVuZGVyZXIuXG4gKiBJdCBpcyB0aGUgaW50ZXJmYWNlIGJldHdlZW4gdGhlIENvbXBvc2l0b3Igd2hpY2ggcmVjZWl2ZXMgY29tbWFuZHNcbiAqIGFuZCB0aGUgcmVuZGVyZXJzIHRoYXQgaW50ZXJwcmV0IHRoZW0uIEl0IGFsc28gcmVsYXlzIGluZm9ybWF0aW9uIHRvXG4gKiB0aGUgcmVuZGVyZXJzIGFib3V0IHJlc2l6aW5nLlxuICpcbiAqIFRoZSBET01FbGVtZW50IGF0IHRoZSBnaXZlbiBxdWVyeSBzZWxlY3RvciBpcyB1c2VkIGFzIHRoZSByb290LiBBXG4gKiBuZXcgRE9NRWxlbWVudCBpcyBhcHBlbmRlZCB0byB0aGlzIHJvb3QgZWxlbWVudCwgYW5kIHVzZWQgYXMgdGhlXG4gKiBwYXJlbnQgZWxlbWVudCBmb3IgYWxsIEZhbW91cyBET00gcmVuZGVyaW5nIGF0IHRoaXMgY29udGV4dC4gQVxuICogY2FudmFzIGlzIGFkZGVkIGFuZCB1c2VkIGZvciBhbGwgV2ViR0wgcmVuZGVyaW5nIGF0IHRoaXMgY29udGV4dC5cbiAqXG4gKiBAY2xhc3MgQ29udGV4dFxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yIFF1ZXJ5IHNlbGVjdG9yIHVzZWQgdG8gbG9jYXRlIHJvb3QgZWxlbWVudCBvZlxuICogY29udGV4dCBsYXllci5cbiAqIEBwYXJhbSB7Q29tcG9zaXRvcn0gY29tcG9zaXRvciBDb21wb3NpdG9yIHJlZmVyZW5jZSB0byBwYXNzIGRvd24gdG9cbiAqIFdlYkdMUmVuZGVyZXIuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gQ29udGV4dChzZWxlY3RvciwgY29tcG9zaXRvcikge1xuICAgIHRoaXMuX2NvbXBvc2l0b3IgPSBjb21wb3NpdG9yO1xuICAgIHRoaXMuX3Jvb3RFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuXG4gICAgdGhpcy5fc2VsZWN0b3IgPSBzZWxlY3RvcjtcblxuICAgIC8vIENyZWF0ZSBET00gZWxlbWVudCB0byBiZSB1c2VkIGFzIHJvb3QgZm9yIGFsbCBmYW1vdXMgRE9NXG4gICAgLy8gcmVuZGVyaW5nIGFuZCBhcHBlbmQgZWxlbWVudCB0byB0aGUgcm9vdCBlbGVtZW50LlxuXG4gICAgdmFyIERPTUxheWVyRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLl9yb290RWwuYXBwZW5kQ2hpbGQoRE9NTGF5ZXJFbCk7XG5cbiAgICAvLyBJbnN0YW50aWF0ZSByZW5kZXJlcnNcblxuICAgIHRoaXMuRE9NUmVuZGVyZXIgPSBuZXcgRE9NUmVuZGVyZXIoRE9NTGF5ZXJFbCwgc2VsZWN0b3IsIGNvbXBvc2l0b3IpO1xuICAgIHRoaXMuV2ViR0xSZW5kZXJlciA9IG51bGw7XG4gICAgdGhpcy5jYW52YXMgPSBudWxsO1xuXG4gICAgLy8gU3RhdGUgaG9sZGVyc1xuXG4gICAgdGhpcy5fcmVuZGVyU3RhdGUgPSB7XG4gICAgICAgIHByb2plY3Rpb25UeXBlOiBDYW1lcmEuT1JUSE9HUkFQSElDX1BST0pFQ1RJT04sXG4gICAgICAgIHBlcnNwZWN0aXZlVHJhbnNmb3JtOiBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSksXG4gICAgICAgIHZpZXdUcmFuc2Zvcm06IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdKSxcbiAgICAgICAgdmlld0RpcnR5OiBmYWxzZSxcbiAgICAgICAgcGVyc3BlY3RpdmVEaXJ0eTogZmFsc2VcbiAgICB9O1xuXG4gICAgdGhpcy5fc2l6ZSA9IFtdO1xuICAgIHRoaXMuX2NoaWxkcmVuID0ge307XG4gICAgdGhpcy5fZWxlbWVudEhhc2ggPSB7fTtcblxuICAgIHRoaXMuX21lc2hUcmFuc2Zvcm0gPSBbXTtcbiAgICB0aGlzLl9tZXNoU2l6ZSA9IFswLCAwLCAwXTtcbn1cblxuLyoqXG4gKiBRdWVyaWVzIERPTVJlbmRlcmVyIHNpemUgYW5kIHVwZGF0ZXMgY2FudmFzIHNpemUuIFJlbGF5cyBzaXplIGluZm9ybWF0aW9uIHRvXG4gKiBXZWJHTFJlbmRlcmVyLlxuICpcbiAqIEByZXR1cm4ge0NvbnRleHR9IHRoaXNcbiAqL1xuQ29udGV4dC5wcm90b3R5cGUudXBkYXRlU2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbmV3U2l6ZSA9IHRoaXMuRE9NUmVuZGVyZXIuZ2V0U2l6ZSgpO1xuICAgIHRoaXMuX2NvbXBvc2l0b3Iuc2VuZFJlc2l6ZSh0aGlzLl9zZWxlY3RvciwgbmV3U2l6ZSk7XG5cbiAgICB2YXIgd2lkdGggPSBuZXdTaXplWzBdO1xuICAgIHZhciBoZWlnaHQgPSBuZXdTaXplWzFdO1xuXG4gICAgdGhpcy5fc2l6ZVswXSA9IHdpZHRoO1xuICAgIHRoaXMuX3NpemVbMV0gPSBoZWlnaHQ7XG4gICAgdGhpcy5fc2l6ZVsyXSA9ICh3aWR0aCA+IGhlaWdodCkgPyB3aWR0aCA6IGhlaWdodDtcblxuICAgIGlmICh0aGlzLmNhbnZhcykge1xuICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCAgPSB3aWR0aDtcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgIH1cblxuICAgIGlmICh0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuV2ViR0xSZW5kZXJlci51cGRhdGVTaXplKHRoaXMuX3NpemUpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERyYXcgZnVuY3Rpb24gY2FsbGVkIGFmdGVyIGFsbCBjb21tYW5kcyBoYXZlIGJlZW4gaGFuZGxlZCBmb3IgY3VycmVudCBmcmFtZS5cbiAqIElzc3VlcyBkcmF3IGNvbW1hbmRzIHRvIGFsbCByZW5kZXJlcnMgd2l0aCBjdXJyZW50IHJlbmRlclN0YXRlLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db250ZXh0LnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gZHJhdygpIHtcbiAgICB0aGlzLkRPTVJlbmRlcmVyLmRyYXcodGhpcy5fcmVuZGVyU3RhdGUpO1xuICAgIGlmICh0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuV2ViR0xSZW5kZXJlci5kcmF3KHRoaXMuX3JlbmRlclN0YXRlKTtcblxuICAgIGlmICh0aGlzLl9yZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZURpcnR5KSB0aGlzLl9yZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZURpcnR5ID0gZmFsc2U7XG4gICAgaWYgKHRoaXMuX3JlbmRlclN0YXRlLnZpZXdEaXJ0eSkgdGhpcy5fcmVuZGVyU3RhdGUudmlld0RpcnR5ID0gZmFsc2U7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHNpemUgb2YgdGhlIHBhcmVudCBlbGVtZW50IG9mIHRoZSBET01SZW5kZXJlciBmb3IgdGhpcyBjb250ZXh0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db250ZXh0LnByb3RvdHlwZS5nZXRSb290U2l6ZSA9IGZ1bmN0aW9uIGdldFJvb3RTaXplKCkge1xuICAgIHJldHVybiB0aGlzLkRPTVJlbmRlcmVyLmdldFNpemUoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyBpbml0aWFsaXphdGlvbiBvZiBXZWJHTFJlbmRlcmVyIHdoZW4gbmVjZXNzYXJ5LCBpbmNsdWRpbmcgY3JlYXRpb25cbiAqIG9mIHRoZSBjYW52YXMgZWxlbWVudCBhbmQgaW5zdGFudGlhdGlvbiBvZiB0aGUgcmVuZGVyZXIuIEFsc28gdXBkYXRlcyBzaXplXG4gKiB0byBwYXNzIHNpemUgaW5mb3JtYXRpb24gdG8gdGhlIHJlbmRlcmVyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db250ZXh0LnByb3RvdHlwZS5pbml0V2ViR0wgPSBmdW5jdGlvbiBpbml0V2ViR0woKSB7XG4gICAgdGhpcy5jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICB0aGlzLl9yb290RWwuYXBwZW5kQ2hpbGQodGhpcy5jYW52YXMpO1xuICAgIHRoaXMuV2ViR0xSZW5kZXJlciA9IG5ldyBXZWJHTFJlbmRlcmVyKHRoaXMuY2FudmFzLCB0aGlzLl9jb21wb3NpdG9yKTtcbiAgICB0aGlzLnVwZGF0ZVNpemUoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyBkZWxlZ2F0aW9uIG9mIGNvbW1hbmRzIHRvIHJlbmRlcmVycyBvZiB0aGlzIGNvbnRleHQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFN0cmluZyB1c2VkIGFzIGlkZW50aWZpZXIgb2YgYSBnaXZlbiBub2RlIGluIHRoZVxuICogc2NlbmUgZ3JhcGguXG4gKiBAcGFyYW0ge0FycmF5fSBjb21tYW5kcyBMaXN0IG9mIGFsbCBjb21tYW5kcyBmcm9tIHRoaXMgZnJhbWUuXG4gKiBAcGFyYW0ge051bWJlcn0gaXRlcmF0b3IgTnVtYmVyIGluZGljYXRpbmcgcHJvZ3Jlc3MgdGhyb3VnaCB0aGUgY29tbWFuZFxuICogcXVldWUuXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSBpdGVyYXRvciBpbmRpY2F0aW5nIHByb2dyZXNzIHRocm91Z2ggdGhlIGNvbW1hbmQgcXVldWUuXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLnJlY2VpdmUgPSBmdW5jdGlvbiByZWNlaXZlKHBhdGgsIGNvbW1hbmRzLCBpdGVyYXRvcikge1xuICAgIHZhciBsb2NhbEl0ZXJhdG9yID0gaXRlcmF0b3I7XG5cbiAgICB2YXIgY29tbWFuZCA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgdGhpcy5ET01SZW5kZXJlci5sb2FkUGF0aChwYXRoKTtcbiAgICB0aGlzLkRPTVJlbmRlcmVyLmZpbmRUYXJnZXQoKTtcbiAgICB3aGlsZSAoY29tbWFuZCkge1xuXG4gICAgICAgIHN3aXRjaCAoY29tbWFuZCkge1xuICAgICAgICAgICAgY2FzZSAnSU5JVF9ET00nOlxuICAgICAgICAgICAgICAgIHRoaXMuRE9NUmVuZGVyZXIuaW5zZXJ0RWwoY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0RPTV9SRU5ERVJfU0laRSc6XG4gICAgICAgICAgICAgICAgdGhpcy5ET01SZW5kZXJlci5nZXRTaXplT2YoY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0NIQU5HRV9UUkFOU0ZPUk0nOlxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwIDsgaSA8IDE2IDsgaSsrKSB0aGlzLl9tZXNoVHJhbnNmb3JtW2ldID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcblxuICAgICAgICAgICAgICAgIHRoaXMuRE9NUmVuZGVyZXIuc2V0TWF0cml4KHRoaXMuX21lc2hUcmFuc2Zvcm0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuV2ViR0xSZW5kZXJlcilcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLnNldEN1dG91dFVuaWZvcm0ocGF0aCwgJ3VfdHJhbnNmb3JtJywgdGhpcy5fbWVzaFRyYW5zZm9ybSk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnQ0hBTkdFX1NJWkUnOlxuICAgICAgICAgICAgICAgIHZhciB3aWR0aCA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgdmFyIGhlaWdodCA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG5cbiAgICAgICAgICAgICAgICB0aGlzLkRPTVJlbmRlcmVyLnNldFNpemUod2lkdGgsIGhlaWdodCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuV2ViR0xSZW5kZXJlcikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9tZXNoU2l6ZVswXSA9IHdpZHRoO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9tZXNoU2l6ZVsxXSA9IGhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLnNldEN1dG91dFVuaWZvcm0ocGF0aCwgJ3Vfc2l6ZScsIHRoaXMuX21lc2hTaXplKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0NIQU5HRV9QUk9QRVJUWSc6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5XZWJHTFJlbmRlcmVyLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuRE9NUmVuZGVyZXIuc2V0UHJvcGVydHkoY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSwgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0NIQU5HRV9DT05URU5UJzpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLldlYkdMUmVuZGVyZXIuZ2V0T3JTZXRDdXRvdXQocGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5ET01SZW5kZXJlci5zZXRDb250ZW50KGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdDSEFOR0VfQVRUUklCVVRFJzpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLldlYkdMUmVuZGVyZXIuZ2V0T3JTZXRDdXRvdXQocGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5ET01SZW5kZXJlci5zZXRBdHRyaWJ1dGUoY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSwgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0FERF9DTEFTUyc6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5XZWJHTFJlbmRlcmVyLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuRE9NUmVuZGVyZXIuYWRkQ2xhc3MoY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ1JFTU9WRV9DTEFTUyc6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5XZWJHTFJlbmRlcmVyLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuRE9NUmVuZGVyZXIucmVtb3ZlQ2xhc3MoY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ1NVQlNDUklCRSc6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5XZWJHTFJlbmRlcmVyLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuRE9NUmVuZGVyZXIuc3Vic2NyaWJlKGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdHTF9TRVRfRFJBV19PUFRJT05TJzpcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5pbml0V2ViR0woKTtcbiAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIuc2V0TWVzaE9wdGlvbnMocGF0aCwgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0dMX0FNQklFTlRfTElHSFQnOlxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLmluaXRXZWJHTCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuV2ViR0xSZW5kZXJlci5zZXRBbWJpZW50TGlnaHRDb2xvcihcbiAgICAgICAgICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0dMX0xJR0hUX1BPU0lUSU9OJzpcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5pbml0V2ViR0woKTtcbiAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIuc2V0TGlnaHRQb3NpdGlvbihcbiAgICAgICAgICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0dMX0xJR0hUX0NPTE9SJzpcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5pbml0V2ViR0woKTtcbiAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIuc2V0TGlnaHRDb2xvcihcbiAgICAgICAgICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ01BVEVSSUFMX0lOUFVUJzpcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5pbml0V2ViR0woKTtcbiAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIuaGFuZGxlTWF0ZXJpYWxJbnB1dChcbiAgICAgICAgICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0dMX1NFVF9HRU9NRVRSWSc6XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuaW5pdFdlYkdMKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLnNldEdlb21ldHJ5KFxuICAgICAgICAgICAgICAgICAgICBwYXRoLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnR0xfVU5JRk9STVMnOlxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLmluaXRXZWJHTCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuV2ViR0xSZW5kZXJlci5zZXRNZXNoVW5pZm9ybShcbiAgICAgICAgICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0dMX0JVRkZFUl9EQVRBJzpcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5pbml0V2ViR0woKTtcbiAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIuYnVmZmVyRGF0YShcbiAgICAgICAgICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0dMX0NVVE9VVF9TVEFURSc6XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuaW5pdFdlYkdMKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLnNldEN1dG91dFN0YXRlKHBhdGgsIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdHTF9NRVNIX1ZJU0lCSUxJVFknOlxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLmluaXRXZWJHTCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuV2ViR0xSZW5kZXJlci5zZXRNZXNoVmlzaWJpbGl0eShwYXRoLCBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnR0xfUkVNT1ZFX01FU0gnOlxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLmluaXRXZWJHTCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuV2ViR0xSZW5kZXJlci5yZW1vdmVNZXNoKHBhdGgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdQSU5IT0xFX1BST0pFQ1RJT04nOlxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnByb2plY3Rpb25UeXBlID0gQ2FtZXJhLlBJTkhPTEVfUFJPSkVDVElPTjtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMV0gPSAtMSAvIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG5cbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZURpcnR5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnT1JUSE9HUkFQSElDX1BST0pFQ1RJT04nOlxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnByb2plY3Rpb25UeXBlID0gQ2FtZXJhLk9SVEhPR1JBUEhJQ19QUk9KRUNUSU9OO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzExXSA9IDA7XG5cbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZURpcnR5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnQ0hBTkdFX1ZJRVdfVFJBTlNGT1JNJzpcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzBdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzFdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzJdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzNdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcblxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bNF0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bNV0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bNl0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bN10gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVs4XSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVs5XSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVsxMF0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bMTFdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcblxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bMTJdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzEzXSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVsxNF0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bMTVdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcblxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdEaXJ0eSA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ1dJVEgnOiByZXR1cm4gbG9jYWxJdGVyYXRvciAtIDE7XG4gICAgICAgIH1cblxuICAgICAgICBjb21tYW5kID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICB9XG5cbiAgICByZXR1cm4gbG9jYWxJdGVyYXRvcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udGV4dDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBUaGUgVUlNYW5hZ2VyIGlzIGJlaW5nIHVwZGF0ZWQgYnkgYW4gRW5naW5lIGJ5IGNvbnNlY3V0aXZlbHkgY2FsbGluZyBpdHNcbiAqIGB1cGRhdGVgIG1ldGhvZC4gSXQgY2FuIGVpdGhlciBtYW5hZ2UgYSByZWFsIFdlYi1Xb3JrZXIgb3IgdGhlIGdsb2JhbFxuICogRmFtb3VzRW5naW5lIGNvcmUgc2luZ2xldG9uLlxuICpcbiAqIEBleGFtcGxlXG4gKiB2YXIgY29tcG9zaXRvciA9IG5ldyBDb21wb3NpdG9yKCk7XG4gKiB2YXIgZW5naW5lID0gbmV3IEVuZ2luZSgpO1xuICpcbiAqIC8vIFVzaW5nIGEgV2ViIFdvcmtlclxuICogdmFyIHdvcmtlciA9IG5ldyBXb3JrZXIoJ3dvcmtlci5idW5kbGUuanMnKTtcbiAqIHZhciB0aHJlYWRtYW5nZXIgPSBuZXcgVUlNYW5hZ2VyKHdvcmtlciwgY29tcG9zaXRvciwgZW5naW5lKTtcbiAqXG4gKiAvLyBXaXRob3V0IHVzaW5nIGEgV2ViIFdvcmtlclxuICogdmFyIHRocmVhZG1hbmdlciA9IG5ldyBVSU1hbmFnZXIoRmFtb3VzLCBjb21wb3NpdG9yLCBlbmdpbmUpO1xuICpcbiAqIEBjbGFzcyAgVUlNYW5hZ2VyXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge0ZhbW91c3xXb3JrZXJ9IHRocmVhZCBUaGUgdGhyZWFkIGJlaW5nIHVzZWQgdG8gcmVjZWl2ZSBtZXNzYWdlc1xuICogZnJvbSBhbmQgcG9zdCBtZXNzYWdlcyB0by4gRXhwZWN0ZWQgdG8gZXhwb3NlIGEgV2ViV29ya2VyLWxpa2UgQVBJLCB3aGljaFxuICogbWVhbnMgcHJvdmlkaW5nIGEgd2F5IHRvIGxpc3RlbiBmb3IgdXBkYXRlcyBieSBzZXR0aW5nIGl0cyBgb25tZXNzYWdlYFxuICogcHJvcGVydHkgYW5kIHNlbmRpbmcgdXBkYXRlcyB1c2luZyBgcG9zdE1lc3NhZ2VgLlxuICogQHBhcmFtIHtDb21wb3NpdG9yfSBjb21wb3NpdG9yIGFuIGluc3RhbmNlIG9mIENvbXBvc2l0b3IgdXNlZCB0byBleHRyYWN0XG4gKiBlbnF1ZXVlZCBkcmF3IGNvbW1hbmRzIGZyb20gdG8gYmUgc2VudCB0byB0aGUgdGhyZWFkLlxuICogQHBhcmFtIHtSZW5kZXJMb29wfSByZW5kZXJMb29wIGFuIGluc3RhbmNlIG9mIEVuZ2luZSB1c2VkIGZvciBleGVjdXRpbmdcbiAqIHRoZSBgRU5HSU5FYCBjb21tYW5kcyBvbi5cbiAqL1xuZnVuY3Rpb24gVUlNYW5hZ2VyICh0aHJlYWQsIGNvbXBvc2l0b3IsIHJlbmRlckxvb3ApIHtcbiAgICB0aGlzLl90aHJlYWQgPSB0aHJlYWQ7XG4gICAgdGhpcy5fY29tcG9zaXRvciA9IGNvbXBvc2l0b3I7XG4gICAgdGhpcy5fcmVuZGVyTG9vcCA9IHJlbmRlckxvb3A7XG5cbiAgICB0aGlzLl9yZW5kZXJMb29wLnVwZGF0ZSh0aGlzKTtcblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy5fdGhyZWFkLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldikge1xuICAgICAgICB2YXIgbWVzc2FnZSA9IGV2LmRhdGEgPyBldi5kYXRhIDogZXY7XG4gICAgICAgIGlmIChtZXNzYWdlWzBdID09PSAnRU5HSU5FJykge1xuICAgICAgICAgICAgc3dpdGNoIChtZXNzYWdlWzFdKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnU1RBUlQnOlxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5fcmVuZGVyTG9vcC5zdGFydCgpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdTVE9QJzpcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3JlbmRlckxvb3Auc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1Vua25vd24gRU5HSU5FIGNvbW1hbmQgXCInICsgbWVzc2FnZVsxXSArICdcIidcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBfdGhpcy5fY29tcG9zaXRvci5yZWNlaXZlQ29tbWFuZHMobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuX3RocmVhZC5vbmVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgIH07XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgdGhyZWFkIGJlaW5nIHVzZWQgYnkgdGhlIFVJTWFuYWdlci5cbiAqIFRoaXMgY291bGQgZWl0aGVyIGJlIGFuIGFuIGFjdHVhbCB3ZWIgd29ya2VyIG9yIGEgYEZhbW91c0VuZ2luZWAgc2luZ2xldG9uLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtXb3JrZXJ8RmFtb3VzRW5naW5lfSBFaXRoZXIgYSB3ZWIgd29ya2VyIG9yIGEgYEZhbW91c0VuZ2luZWAgc2luZ2xldG9uLlxuICovXG5VSU1hbmFnZXIucHJvdG90eXBlLmdldFRocmVhZCA9IGZ1bmN0aW9uIGdldFRocmVhZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fdGhyZWFkO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjb21wb3NpdG9yIGJlaW5nIHVzZWQgYnkgdGhpcyBVSU1hbmFnZXIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0NvbXBvc2l0b3J9IFRoZSBjb21wb3NpdG9yIHVzZWQgYnkgdGhlIFVJTWFuYWdlci5cbiAqL1xuVUlNYW5hZ2VyLnByb3RvdHlwZS5nZXRDb21wb3NpdG9yID0gZnVuY3Rpb24gZ2V0Q29tcG9zaXRvcigpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tcG9zaXRvcjtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZW5naW5lIGJlaW5nIHVzZWQgYnkgdGhpcyBVSU1hbmFnZXIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0VuZ2luZX0gVGhlIGVuZ2luZSB1c2VkIGJ5IHRoZSBVSU1hbmFnZXIuXG4gKi9cblVJTWFuYWdlci5wcm90b3R5cGUuZ2V0RW5naW5lID0gZnVuY3Rpb24gZ2V0RW5naW5lKCkge1xuICAgIHJldHVybiB0aGlzLl9yZW5kZXJMb29wO1xufTtcblxuLyoqXG4gKiBVcGRhdGUgbWV0aG9kIGJlaW5nIGludm9rZWQgYnkgdGhlIEVuZ2luZSBvbiBldmVyeSBgcmVxdWVzdEFuaW1hdGlvbkZyYW1lYC5cbiAqIFVzZWQgZm9yIHVwZGF0aW5nIHRoZSBub3Rpb24gb2YgdGltZSB3aXRoaW4gdGhlIG1hbmFnZWQgdGhyZWFkIGJ5IHNlbmRpbmdcbiAqIGEgRlJBTUUgY29tbWFuZCBhbmQgc2VuZGluZyBtZXNzYWdlcyB0b1xuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHRpbWUgdW5peCB0aW1lc3RhbXAgdG8gYmUgcGFzc2VkIGRvd24gdG8gdGhlIHdvcmtlciBhcyBhXG4gKiBGUkFNRSBjb21tYW5kXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5VSU1hbmFnZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSAodGltZSkge1xuICAgIHRoaXMuX3RocmVhZC5wb3N0TWVzc2FnZShbJ0ZSQU1FJywgdGltZV0pO1xuICAgIHZhciB0aHJlYWRNZXNzYWdlcyA9IHRoaXMuX2NvbXBvc2l0b3IuZHJhd0NvbW1hbmRzKCk7XG4gICAgdGhpcy5fdGhyZWFkLnBvc3RNZXNzYWdlKHRocmVhZE1lc3NhZ2VzKTtcbiAgICB0aGlzLl9jb21wb3NpdG9yLmNsZWFyQ29tbWFuZHMoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVUlNYW5hZ2VyO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY3NzID0gJy5mYW1vdXMtZG9tLXJlbmRlcmVyIHsnICtcbiAgICAnd2lkdGg6MTAwJTsnICtcbiAgICAnaGVpZ2h0OjEwMCU7JyArXG4gICAgJ3RyYW5zZm9ybS1zdHlsZTpwcmVzZXJ2ZS0zZDsnICtcbiAgICAnLXdlYmtpdC10cmFuc2Zvcm0tc3R5bGU6cHJlc2VydmUtM2Q7JyArXG4nfScgK1xuXG4nLmZhbW91cy1kb20tZWxlbWVudCB7JyArXG4gICAgJy13ZWJraXQtdHJhbnNmb3JtLW9yaWdpbjowJSAwJTsnICtcbiAgICAndHJhbnNmb3JtLW9yaWdpbjowJSAwJTsnICtcbiAgICAnLXdlYmtpdC1iYWNrZmFjZS12aXNpYmlsaXR5OnZpc2libGU7JyArXG4gICAgJ2JhY2tmYWNlLXZpc2liaWxpdHk6dmlzaWJsZTsnICtcbiAgICAnLXdlYmtpdC10cmFuc2Zvcm0tc3R5bGU6cHJlc2VydmUtM2Q7JyArXG4gICAgJ3RyYW5zZm9ybS1zdHlsZTpwcmVzZXJ2ZS0zZDsnICtcbiAgICAnLXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50OycgK1xuICAgICdwb2ludGVyLWV2ZW50czphdXRvOycgK1xuICAgICd6LWluZGV4OjE7JyArXG4nfScgK1xuXG4nLmZhbW91cy1kb20tZWxlbWVudC1jb250ZW50LCcgK1xuJy5mYW1vdXMtZG9tLWVsZW1lbnQgeycgK1xuICAgICdwb3NpdGlvbjphYnNvbHV0ZTsnICtcbiAgICAnYm94LXNpemluZzpib3JkZXItYm94OycgK1xuICAgICctbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDsnICtcbiAgICAnLXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7JyArXG4nfScgK1xuXG4nLmZhbW91cy13ZWJnbC1yZW5kZXJlciB7JyArXG4gICAgJy13ZWJraXQtdHJhbnNmb3JtOiB0cmFuc2xhdGVaKDEwMDAwMDBweCk7JyArICAvKiBUT0RPOiBGaXggd2hlbiBTYWZhcmkgRml4ZXMqL1xuICAgICd0cmFuc2Zvcm06IHRyYW5zbGF0ZVooMTAwMDAwMHB4KScgK1xuICAgICdwb2ludGVyLWV2ZW50czpub25lOycgK1xuICAgICdwb3NpdGlvbjphYnNvbHV0ZTsnICtcbiAgICAnei1pbmRleDoxOycgK1xuICAgICd0b3A6MDsnICtcbiAgICAnbGVmdDowOycgK1xuJ30nO1xuXG52YXIgSU5KRUNURUQgPSB0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnO1xuXG5mdW5jdGlvbiBpbmplY3RDU1MoKSB7XG4gICAgaWYgKElOSkVDVEVEKSByZXR1cm47XG4gICAgSU5KRUNURUQgPSB0cnVlO1xuICAgIGlmIChkb2N1bWVudC5jcmVhdGVTdHlsZVNoZWV0KSB7XG4gICAgICAgIHZhciBzaGVldCA9IGRvY3VtZW50LmNyZWF0ZVN0eWxlU2hlZXQoKTtcbiAgICAgICAgc2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBoZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXTtcbiAgICAgICAgdmFyIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcblxuICAgICAgICBpZiAoc3R5bGUuc3R5bGVTaGVldCkge1xuICAgICAgICAgICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG4gICAgICAgIH1cblxuICAgICAgICAoaGVhZCA/IGhlYWQgOiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpLmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW5qZWN0Q1NTO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEEgbGlnaHR3ZWlnaHQsIGZlYXR1cmVsZXNzIEV2ZW50RW1pdHRlci5cbiAqXG4gKiBAY2xhc3MgQ2FsbGJhY2tTdG9yZVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIENhbGxiYWNrU3RvcmUgKCkge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xufVxuXG4vKipcbiAqIEFkZHMgYSBsaXN0ZW5lciBmb3IgdGhlIHNwZWNpZmllZCBldmVudCAoPSBrZXkpLlxuICpcbiAqIEBtZXRob2Qgb25cbiAqIEBjaGFpbmFibGVcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAga2V5ICAgICAgIFRoZSBldmVudCB0eXBlIChlLmcuIGBjbGlja2ApLlxuICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrICBBIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGludm9rZWQgd2hlbmV2ZXIgYGtleWBcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQgaXMgYmVpbmcgdHJpZ2dlcmVkLlxuICogQHJldHVybiB7RnVuY3Rpb259IGRlc3Ryb3kgICBBIGZ1bmN0aW9uIHRvIGNhbGwgaWYgeW91IHdhbnQgdG8gcmVtb3ZlIHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5cbiAqL1xuQ2FsbGJhY2tTdG9yZS5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbiAoa2V5LCBjYWxsYmFjaykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzW2tleV0pIHRoaXMuX2V2ZW50c1trZXldID0gW107XG4gICAgdmFyIGNhbGxiYWNrTGlzdCA9IHRoaXMuX2V2ZW50c1trZXldO1xuICAgIGNhbGxiYWNrTGlzdC5wdXNoKGNhbGxiYWNrKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBjYWxsYmFja0xpc3Quc3BsaWNlKGNhbGxiYWNrTGlzdC5pbmRleE9mKGNhbGxiYWNrKSwgMSk7XG4gICAgfTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhIHByZXZpb3VzbHkgYWRkZWQgZXZlbnQgbGlzdGVuZXIuXG4gKlxuICogQG1ldGhvZCBvZmZcbiAqIEBjaGFpbmFibGVcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGtleSAgICAgICAgIFRoZSBldmVudCB0eXBlIGZyb20gd2hpY2ggdGhlIGNhbGxiYWNrIGZ1bmN0aW9uXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNob3VsZCBiZSByZW1vdmVkLlxuICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrICBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgcmVtb3ZlZCBmcm9tIHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcnMgZm9yIGtleS5cbiAqIEByZXR1cm4ge0NhbGxiYWNrU3RvcmV9IHRoaXNcbiAqL1xuQ2FsbGJhY2tTdG9yZS5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24gb2ZmIChrZXksIGNhbGxiYWNrKSB7XG4gICAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1trZXldO1xuICAgIGlmIChldmVudHMpIGV2ZW50cy5zcGxpY2UoZXZlbnRzLmluZGV4T2YoY2FsbGJhY2spLCAxKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogSW52b2tlcyBhbGwgdGhlIHByZXZpb3VzbHkgZm9yIHRoaXMga2V5IHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxuICpcbiAqIEBtZXRob2QgdHJpZ2dlclxuICogQGNoYWluYWJsZVxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gICAgICAgIGtleSAgICAgIFRoZSBldmVudCB0eXBlLlxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgICAgcGF5bG9hZCAgVGhlIGV2ZW50IHBheWxvYWQgKGV2ZW50IG9iamVjdCkuXG4gKiBAcmV0dXJuIHtDYWxsYmFja1N0b3JlfSB0aGlzXG4gKi9cbkNhbGxiYWNrU3RvcmUucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbiB0cmlnZ2VyIChrZXksIHBheWxvYWQpIHtcbiAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW2tleV07XG4gICAgaWYgKGV2ZW50cykge1xuICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgIHZhciBsZW4gPSBldmVudHMubGVuZ3RoO1xuICAgICAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykgZXZlbnRzW2ldKHBheWxvYWQpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsbGJhY2tTdG9yZTtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBEZWVwIGNsb25lIGFuIG9iamVjdC5cbiAqXG4gKiBAbWV0aG9kICBjbG9uZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBiICAgICAgIE9iamVjdCB0byBiZSBjbG9uZWQuXG4gKiBAcmV0dXJuIHtPYmplY3R9IGEgICAgICBDbG9uZWQgb2JqZWN0IChkZWVwIGVxdWFsaXR5KS5cbiAqL1xudmFyIGNsb25lID0gZnVuY3Rpb24gY2xvbmUoYikge1xuICAgIHZhciBhO1xuICAgIGlmICh0eXBlb2YgYiA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgYSA9IChiIGluc3RhbmNlb2YgQXJyYXkpID8gW10gOiB7fTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGIpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYltrZXldID09PSAnb2JqZWN0JyAmJiBiW2tleV0gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoYltrZXldIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgYVtrZXldID0gbmV3IEFycmF5KGJba2V5XS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJba2V5XS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYVtrZXldW2ldID0gY2xvbmUoYltrZXldW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGFba2V5XSA9IGNsb25lKGJba2V5XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYVtrZXldID0gYltrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBhID0gYjtcbiAgICB9XG4gICAgcmV0dXJuIGE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsb25lO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4vKipcbiAqIFRha2VzIGFuIG9iamVjdCBjb250YWluaW5nIGtleXMgYW5kIHZhbHVlcyBhbmQgcmV0dXJucyBhbiBvYmplY3RcbiAqIGNvbXByaXNpbmcgdHdvIFwiYXNzb2NpYXRlXCIgYXJyYXlzLCBvbmUgd2l0aCB0aGUga2V5cyBhbmQgdGhlIG90aGVyXG4gKiB3aXRoIHRoZSB2YWx1ZXMuXG4gKlxuICogQG1ldGhvZCBrZXlWYWx1ZXNUb0FycmF5c1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogICAgICAgICAgICAgICAgICAgICAgT2JqZWN0cyB3aGVyZSB0byBleHRyYWN0IGtleXMgYW5kIHZhbHVlc1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcm9tLlxuICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgIHJlc3VsdFxuICogICAgICAgICB7QXJyYXkuPFN0cmluZz59IHJlc3VsdC5rZXlzICAgICBLZXlzIG9mIGByZXN1bHRgLCBhcyByZXR1cm5lZCBieVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgT2JqZWN0LmtleXMoKWBcbiAqICAgICAgICAge0FycmF5fSAgICAgICAgICByZXN1bHQudmFsdWVzICAgVmFsdWVzIG9mIHBhc3NlZCBpbiBvYmplY3QuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ga2V5VmFsdWVzVG9BcnJheXMob2JqKSB7XG4gICAgdmFyIGtleXNBcnJheSA9IFtdLCB2YWx1ZXNBcnJheSA9IFtdO1xuICAgIHZhciBpID0gMDtcbiAgICBmb3IodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBrZXlzQXJyYXlbaV0gPSBrZXk7XG4gICAgICAgICAgICB2YWx1ZXNBcnJheVtpXSA9IG9ialtrZXldO1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIGtleXM6IGtleXNBcnJheSxcbiAgICAgICAgdmFsdWVzOiB2YWx1ZXNBcnJheVxuICAgIH07XG59O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgUFJFRklYRVMgPSBbJycsICctbXMtJywgJy13ZWJraXQtJywgJy1tb3otJywgJy1vLSddO1xuXG4vKipcbiAqIEEgaGVscGVyIGZ1bmN0aW9uIHVzZWQgZm9yIGRldGVybWluaW5nIHRoZSB2ZW5kb3IgcHJlZml4ZWQgdmVyc2lvbiBvZiB0aGVcbiAqIHBhc3NlZCBpbiBDU1MgcHJvcGVydHkuXG4gKlxuICogVmVuZG9yIGNoZWNrcyBhcmUgYmVpbmcgY29uZHVjdGVkIGluIHRoZSBmb2xsb3dpbmcgb3JkZXI6XG4gKlxuICogMS4gKG5vIHByZWZpeClcbiAqIDIuIGAtbXotYFxuICogMy4gYC13ZWJraXQtYFxuICogNC4gYC1tb3otYFxuICogNS4gYC1vLWBcbiAqXG4gKiBAbWV0aG9kIHZlbmRvclByZWZpeFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwcm9wZXJ0eSAgICAgQ1NTIHByb3BlcnR5IChubyBjYW1lbENhc2UpLCBlLmcuXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBib3JkZXItcmFkaXVzYC5cbiAqIEByZXR1cm4ge1N0cmluZ30gcHJlZml4ZWQgICAgVmVuZG9yIHByZWZpeGVkIHZlcnNpb24gb2YgcGFzc2VkIGluIENTU1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSAoZS5nLiBgLXdlYmtpdC1ib3JkZXItcmFkaXVzYCkuXG4gKi9cbmZ1bmN0aW9uIHZlbmRvclByZWZpeChwcm9wZXJ0eSkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgUFJFRklYRVMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHByZWZpeGVkID0gUFJFRklYRVNbaV0gKyBwcm9wZXJ0eTtcbiAgICAgICAgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZVtwcmVmaXhlZF0gPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJlZml4ZWQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHByb3BlcnR5O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHZlbmRvclByZWZpeDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEdlb21ldHJ5SWRzID0gMDtcblxuLyoqXG4gKiBHZW9tZXRyeSBpcyBhIGNvbXBvbmVudCB0aGF0IGRlZmluZXMgYW5kIG1hbmFnZXMgZGF0YVxuICogKHZlcnRleCBkYXRhIGFuZCBhdHRyaWJ1dGVzKSB0aGF0IGlzIHVzZWQgdG8gZHJhdyB0byBXZWJHTC5cbiAqXG4gKiBAY2xhc3MgR2VvbWV0cnlcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIGluc3RhbnRpYXRpb24gb3B0aW9uc1xuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gR2VvbWV0cnkob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdGhpcy5ERUZBVUxUX0JVRkZFUl9TSVpFID0gMztcblxuICAgIHRoaXMuc3BlYyA9IHtcbiAgICAgICAgaWQ6IEdlb21ldHJ5SWRzKyssXG4gICAgICAgIGR5bmFtaWM6IGZhbHNlLFxuICAgICAgICB0eXBlOiB0aGlzLm9wdGlvbnMudHlwZSB8fCAnVFJJQU5HTEVTJyxcbiAgICAgICAgYnVmZmVyTmFtZXM6IFtdLFxuICAgICAgICBidWZmZXJWYWx1ZXM6IFtdLFxuICAgICAgICBidWZmZXJTcGFjaW5nczogW10sXG4gICAgICAgIGludmFsaWRhdGlvbnM6IFtdXG4gICAgfTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYnVmZmVycykge1xuICAgICAgICB2YXIgbGVuID0gdGhpcy5vcHRpb25zLmJ1ZmZlcnMubGVuZ3RoO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjspIHtcbiAgICAgICAgICAgIHRoaXMuc3BlYy5idWZmZXJOYW1lcy5wdXNoKHRoaXMub3B0aW9ucy5idWZmZXJzW2ldLm5hbWUpO1xuICAgICAgICAgICAgdGhpcy5zcGVjLmJ1ZmZlclZhbHVlcy5wdXNoKHRoaXMub3B0aW9ucy5idWZmZXJzW2ldLmRhdGEpO1xuICAgICAgICAgICAgdGhpcy5zcGVjLmJ1ZmZlclNwYWNpbmdzLnB1c2godGhpcy5vcHRpb25zLmJ1ZmZlcnNbaV0uc2l6ZSB8fCB0aGlzLkRFRkFVTFRfQlVGRkVSX1NJWkUpO1xuICAgICAgICAgICAgdGhpcy5zcGVjLmludmFsaWRhdGlvbnMucHVzaChpKyspO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEdlb21ldHJ5O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVmVjMyA9IHJlcXVpcmUoJy4uL21hdGgvVmVjMycpO1xudmFyIFZlYzIgPSByZXF1aXJlKCcuLi9tYXRoL1ZlYzInKTtcblxudmFyIG91dHB1dHMgPSBbXG4gICAgbmV3IFZlYzMoKSxcbiAgICBuZXcgVmVjMygpLFxuICAgIG5ldyBWZWMzKCksXG4gICAgbmV3IFZlYzIoKSxcbiAgICBuZXcgVmVjMigpXG5dO1xuXG4vKipcbiAqIEEgaGVscGVyIG9iamVjdCB1c2VkIHRvIGNhbGN1bGF0ZSBidWZmZXJzIGZvciBjb21wbGljYXRlZCBnZW9tZXRyaWVzLlxuICogVGFpbG9yZWQgZm9yIHRoZSBXZWJHTFJlbmRlcmVyLCB1c2VkIGJ5IG1vc3QgcHJpbWl0aXZlcy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAY2xhc3MgR2VvbWV0cnlIZWxwZXJcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbnZhciBHZW9tZXRyeUhlbHBlciA9IHt9O1xuXG4vKipcbiAqIEEgZnVuY3Rpb24gdGhhdCBpdGVyYXRlcyB0aHJvdWdoIHZlcnRpY2FsIGFuZCBob3Jpem9udGFsIHNsaWNlc1xuICogYmFzZWQgb24gaW5wdXQgZGV0YWlsLCBhbmQgZ2VuZXJhdGVzIHZlcnRpY2VzIGFuZCBpbmRpY2VzIGZvciBlYWNoXG4gKiBzdWJkaXZpc2lvbi5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSBkZXRhaWxYIEFtb3VudCBvZiBzbGljZXMgdG8gaXRlcmF0ZSB0aHJvdWdoLlxuICogQHBhcmFtICB7TnVtYmVyfSBkZXRhaWxZIEFtb3VudCBvZiBzdGFja3MgdG8gaXRlcmF0ZSB0aHJvdWdoLlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZ1bmMgRnVuY3Rpb24gdXNlZCB0byBnZW5lcmF0ZSB2ZXJ0ZXggcG9zaXRpb25zIGF0IGVhY2ggcG9pbnQuXG4gKiBAcGFyYW0gIHtCb29sZWFufSB3cmFwIE9wdGlvbmFsIHBhcmFtZXRlciAoZGVmYXVsdDogUGkpIGZvciBzZXR0aW5nIGEgY3VzdG9tIHdyYXAgcmFuZ2VcbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IE9iamVjdCBjb250YWluaW5nIGdlbmVyYXRlZCB2ZXJ0aWNlcyBhbmQgaW5kaWNlcy5cbiAqL1xuR2VvbWV0cnlIZWxwZXIuZ2VuZXJhdGVQYXJhbWV0cmljID0gZnVuY3Rpb24gZ2VuZXJhdGVQYXJhbWV0cmljKGRldGFpbFgsIGRldGFpbFksIGZ1bmMsIHdyYXApIHtcbiAgICB2YXIgdmVydGljZXMgPSBbXTtcbiAgICB2YXIgaTtcbiAgICB2YXIgdGhldGE7XG4gICAgdmFyIHBoaTtcbiAgICB2YXIgajtcblxuICAgIC8vIFdlIGNhbiB3cmFwIGFyb3VuZCBzbGlnaHRseSBtb3JlIHRoYW4gb25jZSBmb3IgdXYgY29vcmRpbmF0ZXMgdG8gbG9vayBjb3JyZWN0LlxuXG4gICAgdmFyIFhyYW5nZSA9IHdyYXAgPyBNYXRoLlBJICsgKE1hdGguUEkgLyAoZGV0YWlsWCAtIDEpKSA6IE1hdGguUEk7XG4gICAgdmFyIG91dCA9IFtdO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGRldGFpbFggKyAxOyBpKyspIHtcbiAgICAgICAgdGhldGEgPSBpICogWHJhbmdlIC8gZGV0YWlsWDtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IGRldGFpbFk7IGorKykge1xuICAgICAgICAgICAgcGhpID0gaiAqIDIuMCAqIFhyYW5nZSAvIGRldGFpbFk7XG4gICAgICAgICAgICBmdW5jKHRoZXRhLCBwaGksIG91dCk7XG4gICAgICAgICAgICB2ZXJ0aWNlcy5wdXNoKG91dFswXSwgb3V0WzFdLCBvdXRbMl0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGluZGljZXMgPSBbXSxcbiAgICAgICAgdiA9IDAsXG4gICAgICAgIG5leHQ7XG4gICAgZm9yIChpID0gMDsgaSA8IGRldGFpbFg7IGkrKykge1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgZGV0YWlsWTsgaisrKSB7XG4gICAgICAgICAgICBuZXh0ID0gKGogKyAxKSAlIGRldGFpbFk7XG4gICAgICAgICAgICBpbmRpY2VzLnB1c2godiArIGosIHYgKyBqICsgZGV0YWlsWSwgdiArIG5leHQpO1xuICAgICAgICAgICAgaW5kaWNlcy5wdXNoKHYgKyBuZXh0LCB2ICsgaiArIGRldGFpbFksIHYgKyBuZXh0ICsgZGV0YWlsWSk7XG4gICAgICAgIH1cbiAgICAgICAgdiArPSBkZXRhaWxZO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIHZlcnRpY2VzOiB2ZXJ0aWNlcyxcbiAgICAgICAgaW5kaWNlczogaW5kaWNlc1xuICAgIH07XG59O1xuXG4vKipcbiAqIENhbGN1bGF0ZXMgbm9ybWFscyBiZWxvbmdpbmcgdG8gZWFjaCBmYWNlIG9mIGEgZ2VvbWV0cnkuXG4gKiBBc3N1bWVzIGNsb2Nrd2lzZSBkZWNsYXJhdGlvbiBvZiB2ZXJ0aWNlcy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmVydGljZXMgVmVydGljZXMgb2YgYWxsIHBvaW50cyBvbiB0aGUgZ2VvbWV0cnkuXG4gKiBAcGFyYW0ge0FycmF5fSBpbmRpY2VzIEluZGljZXMgZGVjbGFyaW5nIGZhY2VzIG9mIGdlb21ldHJ5LlxuICogQHBhcmFtIHtBcnJheX0gb3V0IEFycmF5IHRvIGJlIGZpbGxlZCBhbmQgcmV0dXJuZWQuXG4gKlxuICogQHJldHVybiB7QXJyYXl9IENhbGN1bGF0ZWQgZmFjZSBub3JtYWxzLlxuICovXG5HZW9tZXRyeUhlbHBlci5jb21wdXRlTm9ybWFscyA9IGZ1bmN0aW9uIGNvbXB1dGVOb3JtYWxzKHZlcnRpY2VzLCBpbmRpY2VzLCBvdXQpIHtcbiAgICB2YXIgbm9ybWFscyA9IG91dCB8fCBbXTtcbiAgICB2YXIgaW5kZXhPbmU7XG4gICAgdmFyIGluZGV4VHdvO1xuICAgIHZhciBpbmRleFRocmVlO1xuICAgIHZhciBub3JtYWw7XG4gICAgdmFyIGo7XG4gICAgdmFyIGxlbiA9IGluZGljZXMubGVuZ3RoIC8gMztcbiAgICB2YXIgaTtcbiAgICB2YXIgeDtcbiAgICB2YXIgeTtcbiAgICB2YXIgejtcbiAgICB2YXIgbGVuZ3RoO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGluZGV4VHdvID0gaW5kaWNlc1tpKjMgKyAwXSAqIDM7XG4gICAgICAgIGluZGV4T25lID0gaW5kaWNlc1tpKjMgKyAxXSAqIDM7XG4gICAgICAgIGluZGV4VGhyZWUgPSBpbmRpY2VzW2kqMyArIDJdICogMztcblxuICAgICAgICBvdXRwdXRzWzBdLnNldCh2ZXJ0aWNlc1tpbmRleE9uZV0sIHZlcnRpY2VzW2luZGV4T25lICsgMV0sIHZlcnRpY2VzW2luZGV4T25lICsgMl0pO1xuICAgICAgICBvdXRwdXRzWzFdLnNldCh2ZXJ0aWNlc1tpbmRleFR3b10sIHZlcnRpY2VzW2luZGV4VHdvICsgMV0sIHZlcnRpY2VzW2luZGV4VHdvICsgMl0pO1xuICAgICAgICBvdXRwdXRzWzJdLnNldCh2ZXJ0aWNlc1tpbmRleFRocmVlXSwgdmVydGljZXNbaW5kZXhUaHJlZSArIDFdLCB2ZXJ0aWNlc1tpbmRleFRocmVlICsgMl0pO1xuXG4gICAgICAgIG5vcm1hbCA9IG91dHB1dHNbMl0uc3VidHJhY3Qob3V0cHV0c1swXSkuY3Jvc3Mob3V0cHV0c1sxXS5zdWJ0cmFjdChvdXRwdXRzWzBdKSkubm9ybWFsaXplKCk7XG5cbiAgICAgICAgbm9ybWFsc1tpbmRleE9uZSArIDBdID0gKG5vcm1hbHNbaW5kZXhPbmUgKyAwXSB8fCAwKSArIG5vcm1hbC54O1xuICAgICAgICBub3JtYWxzW2luZGV4T25lICsgMV0gPSAobm9ybWFsc1tpbmRleE9uZSArIDFdIHx8IDApICsgbm9ybWFsLnk7XG4gICAgICAgIG5vcm1hbHNbaW5kZXhPbmUgKyAyXSA9IChub3JtYWxzW2luZGV4T25lICsgMl0gfHwgMCkgKyBub3JtYWwuejtcblxuICAgICAgICBub3JtYWxzW2luZGV4VHdvICsgMF0gPSAobm9ybWFsc1tpbmRleFR3byArIDBdIHx8IDApICsgbm9ybWFsLng7XG4gICAgICAgIG5vcm1hbHNbaW5kZXhUd28gKyAxXSA9IChub3JtYWxzW2luZGV4VHdvICsgMV0gfHwgMCkgKyBub3JtYWwueTtcbiAgICAgICAgbm9ybWFsc1tpbmRleFR3byArIDJdID0gKG5vcm1hbHNbaW5kZXhUd28gKyAyXSB8fCAwKSArIG5vcm1hbC56O1xuXG4gICAgICAgIG5vcm1hbHNbaW5kZXhUaHJlZSArIDBdID0gKG5vcm1hbHNbaW5kZXhUaHJlZSArIDBdIHx8IDApICsgbm9ybWFsLng7XG4gICAgICAgIG5vcm1hbHNbaW5kZXhUaHJlZSArIDFdID0gKG5vcm1hbHNbaW5kZXhUaHJlZSArIDFdIHx8IDApICsgbm9ybWFsLnk7XG4gICAgICAgIG5vcm1hbHNbaW5kZXhUaHJlZSArIDJdID0gKG5vcm1hbHNbaW5kZXhUaHJlZSArIDJdIHx8IDApICsgbm9ybWFsLno7XG4gICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IG5vcm1hbHMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgeCA9IG5vcm1hbHNbaV07XG4gICAgICAgIHkgPSBub3JtYWxzW2krMV07XG4gICAgICAgIHogPSBub3JtYWxzW2krMl07XG4gICAgICAgIGxlbmd0aCA9IE1hdGguc3FydCh4ICogeCArIHkgKiB5ICsgeiAqIHopO1xuICAgICAgICBmb3IoaiA9IDA7IGo8IDM7IGorKykge1xuICAgICAgICAgICAgbm9ybWFsc1tpK2pdIC89IGxlbmd0aDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBub3JtYWxzO1xufTtcblxuLyoqXG4gKiBEaXZpZGVzIGFsbCBpbnNlcnRlZCB0cmlhbmdsZXMgaW50byBmb3VyIHN1Yi10cmlhbmdsZXMuIEFsdGVycyB0aGVcbiAqIHBhc3NlZCBpbiBhcnJheXMuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGluZGljZXMgSW5kaWNlcyBkZWNsYXJpbmcgZmFjZXMgb2YgZ2VvbWV0cnlcbiAqIEBwYXJhbSB7QXJyYXl9IHZlcnRpY2VzIFZlcnRpY2VzIG9mIGFsbCBwb2ludHMgb24gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSB0ZXh0dXJlQ29vcmRzIFRleHR1cmUgY29vcmRpbmF0ZXMgb2YgYWxsIHBvaW50cyBvbiB0aGUgZ2VvbWV0cnlcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkdlb21ldHJ5SGVscGVyLnN1YmRpdmlkZSA9IGZ1bmN0aW9uIHN1YmRpdmlkZShpbmRpY2VzLCB2ZXJ0aWNlcywgdGV4dHVyZUNvb3Jkcykge1xuICAgIHZhciB0cmlhbmdsZUluZGV4ID0gaW5kaWNlcy5sZW5ndGggLyAzO1xuICAgIHZhciBmYWNlO1xuICAgIHZhciBpO1xuICAgIHZhciBqO1xuICAgIHZhciBrO1xuICAgIHZhciBwb3M7XG4gICAgdmFyIHRleDtcblxuICAgIHdoaWxlICh0cmlhbmdsZUluZGV4LS0pIHtcbiAgICAgICAgZmFjZSA9IGluZGljZXMuc2xpY2UodHJpYW5nbGVJbmRleCAqIDMsIHRyaWFuZ2xlSW5kZXggKiAzICsgMyk7XG5cbiAgICAgICAgcG9zID0gZmFjZS5tYXAoZnVuY3Rpb24odmVydEluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlYzModmVydGljZXNbdmVydEluZGV4ICogM10sIHZlcnRpY2VzW3ZlcnRJbmRleCAqIDMgKyAxXSwgdmVydGljZXNbdmVydEluZGV4ICogMyArIDJdKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZlcnRpY2VzLnB1c2guYXBwbHkodmVydGljZXMsIFZlYzMuc2NhbGUoVmVjMy5hZGQocG9zWzBdLCBwb3NbMV0sIG91dHB1dHNbMF0pLCAwLjUsIG91dHB1dHNbMV0pLnRvQXJyYXkoKSk7XG4gICAgICAgIHZlcnRpY2VzLnB1c2guYXBwbHkodmVydGljZXMsIFZlYzMuc2NhbGUoVmVjMy5hZGQocG9zWzFdLCBwb3NbMl0sIG91dHB1dHNbMF0pLCAwLjUsIG91dHB1dHNbMV0pLnRvQXJyYXkoKSk7XG4gICAgICAgIHZlcnRpY2VzLnB1c2guYXBwbHkodmVydGljZXMsIFZlYzMuc2NhbGUoVmVjMy5hZGQocG9zWzBdLCBwb3NbMl0sIG91dHB1dHNbMF0pLCAwLjUsIG91dHB1dHNbMV0pLnRvQXJyYXkoKSk7XG5cbiAgICAgICAgaWYgKHRleHR1cmVDb29yZHMpIHtcbiAgICAgICAgICAgIHRleCA9IGZhY2UubWFwKGZ1bmN0aW9uKHZlcnRJbmRleCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVmVjMih0ZXh0dXJlQ29vcmRzW3ZlcnRJbmRleCAqIDJdLCB0ZXh0dXJlQ29vcmRzW3ZlcnRJbmRleCAqIDIgKyAxXSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRleHR1cmVDb29yZHMucHVzaC5hcHBseSh0ZXh0dXJlQ29vcmRzLCBWZWMyLnNjYWxlKFZlYzIuYWRkKHRleFswXSwgdGV4WzFdLCBvdXRwdXRzWzNdKSwgMC41LCBvdXRwdXRzWzRdKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgdGV4dHVyZUNvb3Jkcy5wdXNoLmFwcGx5KHRleHR1cmVDb29yZHMsIFZlYzIuc2NhbGUoVmVjMi5hZGQodGV4WzFdLCB0ZXhbMl0sIG91dHB1dHNbM10pLCAwLjUsIG91dHB1dHNbNF0pLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICB0ZXh0dXJlQ29vcmRzLnB1c2guYXBwbHkodGV4dHVyZUNvb3JkcywgVmVjMi5zY2FsZShWZWMyLmFkZCh0ZXhbMF0sIHRleFsyXSwgb3V0cHV0c1szXSksIDAuNSwgb3V0cHV0c1s0XSkudG9BcnJheSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGkgPSB2ZXJ0aWNlcy5sZW5ndGggLSAzO1xuICAgICAgICBqID0gaSArIDE7XG4gICAgICAgIGsgPSBpICsgMjtcblxuICAgICAgICBpbmRpY2VzLnB1c2goaSwgaiwgayk7XG4gICAgICAgIGluZGljZXMucHVzaChmYWNlWzBdLCBpLCBrKTtcbiAgICAgICAgaW5kaWNlcy5wdXNoKGksIGZhY2VbMV0sIGopO1xuICAgICAgICBpbmRpY2VzW3RyaWFuZ2xlSW5kZXhdID0gaztcbiAgICAgICAgaW5kaWNlc1t0cmlhbmdsZUluZGV4ICsgMV0gPSBqO1xuICAgICAgICBpbmRpY2VzW3RyaWFuZ2xlSW5kZXggKyAyXSA9IGZhY2VbMl07XG4gICAgfVxufTtcblxuLyoqXG4gKiBDcmVhdGVzIGR1cGxpY2F0ZSBvZiB2ZXJ0aWNlcyB0aGF0IGFyZSBzaGFyZWQgYmV0d2VlbiBmYWNlcy5cbiAqIEFsdGVycyB0aGUgaW5wdXQgdmVydGV4IGFuZCBpbmRleCBhcnJheXMuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZlcnRpY2VzIFZlcnRpY2VzIG9mIGFsbCBwb2ludHMgb24gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSBpbmRpY2VzIEluZGljZXMgZGVjbGFyaW5nIGZhY2VzIG9mIGdlb21ldHJ5XG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5HZW9tZXRyeUhlbHBlci5nZXRVbmlxdWVGYWNlcyA9IGZ1bmN0aW9uIGdldFVuaXF1ZUZhY2VzKHZlcnRpY2VzLCBpbmRpY2VzKSB7XG4gICAgdmFyIHRyaWFuZ2xlSW5kZXggPSBpbmRpY2VzLmxlbmd0aCAvIDMsXG4gICAgICAgIHJlZ2lzdGVyZWQgPSBbXSxcbiAgICAgICAgaW5kZXg7XG5cbiAgICB3aGlsZSAodHJpYW5nbGVJbmRleC0tKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMzsgaSsrKSB7XG5cbiAgICAgICAgICAgIGluZGV4ID0gaW5kaWNlc1t0cmlhbmdsZUluZGV4ICogMyArIGldO1xuXG4gICAgICAgICAgICBpZiAocmVnaXN0ZXJlZFtpbmRleF0pIHtcbiAgICAgICAgICAgICAgICB2ZXJ0aWNlcy5wdXNoKHZlcnRpY2VzW2luZGV4ICogM10sIHZlcnRpY2VzW2luZGV4ICogMyArIDFdLCB2ZXJ0aWNlc1tpbmRleCAqIDMgKyAyXSk7XG4gICAgICAgICAgICAgICAgaW5kaWNlc1t0cmlhbmdsZUluZGV4ICogMyArIGldID0gdmVydGljZXMubGVuZ3RoIC8gMyAtIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWdpc3RlcmVkW2luZGV4XSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIERpdmlkZXMgYWxsIGluc2VydGVkIHRyaWFuZ2xlcyBpbnRvIGZvdXIgc3ViLXRyaWFuZ2xlcyB3aGlsZSBtYWludGFpbmluZ1xuICogYSByYWRpdXMgb2Ygb25lLiBBbHRlcnMgdGhlIHBhc3NlZCBpbiBhcnJheXMuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZlcnRpY2VzIFZlcnRpY2VzIG9mIGFsbCBwb2ludHMgb24gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSBpbmRpY2VzIEluZGljZXMgZGVjbGFyaW5nIGZhY2VzIG9mIGdlb21ldHJ5XG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5HZW9tZXRyeUhlbHBlci5zdWJkaXZpZGVTcGhlcm9pZCA9IGZ1bmN0aW9uIHN1YmRpdmlkZVNwaGVyb2lkKHZlcnRpY2VzLCBpbmRpY2VzKSB7XG4gICAgdmFyIHRyaWFuZ2xlSW5kZXggPSBpbmRpY2VzLmxlbmd0aCAvIDMsXG4gICAgICAgIGFiYyxcbiAgICAgICAgZmFjZSxcbiAgICAgICAgaSwgaiwgaztcblxuICAgIHdoaWxlICh0cmlhbmdsZUluZGV4LS0pIHtcbiAgICAgICAgZmFjZSA9IGluZGljZXMuc2xpY2UodHJpYW5nbGVJbmRleCAqIDMsIHRyaWFuZ2xlSW5kZXggKiAzICsgMyk7XG4gICAgICAgIGFiYyA9IGZhY2UubWFwKGZ1bmN0aW9uKHZlcnRJbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHZlcnRpY2VzW3ZlcnRJbmRleCAqIDNdLCB2ZXJ0aWNlc1t2ZXJ0SW5kZXggKiAzICsgMV0sIHZlcnRpY2VzW3ZlcnRJbmRleCAqIDMgKyAyXSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZlcnRpY2VzLnB1c2guYXBwbHkodmVydGljZXMsIFZlYzMubm9ybWFsaXplKFZlYzMuYWRkKGFiY1swXSwgYWJjWzFdLCBvdXRwdXRzWzBdKSwgb3V0cHV0c1sxXSkudG9BcnJheSgpKTtcbiAgICAgICAgdmVydGljZXMucHVzaC5hcHBseSh2ZXJ0aWNlcywgVmVjMy5ub3JtYWxpemUoVmVjMy5hZGQoYWJjWzFdLCBhYmNbMl0sIG91dHB1dHNbMF0pLCBvdXRwdXRzWzFdKS50b0FycmF5KCkpO1xuICAgICAgICB2ZXJ0aWNlcy5wdXNoLmFwcGx5KHZlcnRpY2VzLCBWZWMzLm5vcm1hbGl6ZShWZWMzLmFkZChhYmNbMF0sIGFiY1syXSwgb3V0cHV0c1swXSksIG91dHB1dHNbMV0pLnRvQXJyYXkoKSk7XG5cbiAgICAgICAgaSA9IHZlcnRpY2VzLmxlbmd0aCAvIDMgLSAzO1xuICAgICAgICBqID0gaSArIDE7XG4gICAgICAgIGsgPSBpICsgMjtcblxuICAgICAgICBpbmRpY2VzLnB1c2goaSwgaiwgayk7XG4gICAgICAgIGluZGljZXMucHVzaChmYWNlWzBdLCBpLCBrKTtcbiAgICAgICAgaW5kaWNlcy5wdXNoKGksIGZhY2VbMV0sIGopO1xuICAgICAgICBpbmRpY2VzW3RyaWFuZ2xlSW5kZXggKiAzXSA9IGs7XG4gICAgICAgIGluZGljZXNbdHJpYW5nbGVJbmRleCAqIDMgKyAxXSA9IGo7XG4gICAgICAgIGluZGljZXNbdHJpYW5nbGVJbmRleCAqIDMgKyAyXSA9IGZhY2VbMl07XG4gICAgfVxufTtcblxuLyoqXG4gKiBEaXZpZGVzIGFsbCBpbnNlcnRlZCB0cmlhbmdsZXMgaW50byBmb3VyIHN1Yi10cmlhbmdsZXMgd2hpbGUgbWFpbnRhaW5pbmdcbiAqIGEgcmFkaXVzIG9mIG9uZS4gQWx0ZXJzIHRoZSBwYXNzZWQgaW4gYXJyYXlzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2ZXJ0aWNlcyBWZXJ0aWNlcyBvZiBhbGwgcG9pbnRzIG9uIHRoZSBnZW9tZXRyeVxuICogQHBhcmFtIHtBcnJheX0gb3V0IE9wdGlvbmFsIGFycmF5IHRvIGJlIGZpbGxlZCB3aXRoIHJlc3VsdGluZyBub3JtYWxzLlxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBOZXcgbGlzdCBvZiBjYWxjdWxhdGVkIG5vcm1hbHMuXG4gKi9cbkdlb21ldHJ5SGVscGVyLmdldFNwaGVyb2lkTm9ybWFscyA9IGZ1bmN0aW9uIGdldFNwaGVyb2lkTm9ybWFscyh2ZXJ0aWNlcywgb3V0KSB7XG4gICAgb3V0ID0gb3V0IHx8IFtdO1xuICAgIHZhciBsZW5ndGggPSB2ZXJ0aWNlcy5sZW5ndGggLyAzO1xuICAgIHZhciBub3JtYWxpemVkO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBub3JtYWxpemVkID0gbmV3IFZlYzMoXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogMyArIDBdLFxuICAgICAgICAgICAgdmVydGljZXNbaSAqIDMgKyAxXSxcbiAgICAgICAgICAgIHZlcnRpY2VzW2kgKiAzICsgMl1cbiAgICAgICAgKS5ub3JtYWxpemUoKS50b0FycmF5KCk7XG5cbiAgICAgICAgb3V0W2kgKiAzICsgMF0gPSBub3JtYWxpemVkWzBdO1xuICAgICAgICBvdXRbaSAqIDMgKyAxXSA9IG5vcm1hbGl6ZWRbMV07XG4gICAgICAgIG91dFtpICogMyArIDJdID0gbm9ybWFsaXplZFsyXTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0O1xufTtcblxuLyoqXG4gKiBDYWxjdWxhdGVzIHRleHR1cmUgY29vcmRpbmF0ZXMgZm9yIHNwaGVyb2lkIHByaW1pdGl2ZXMgYmFzZWQgb25cbiAqIGlucHV0IHZlcnRpY2VzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2ZXJ0aWNlcyBWZXJ0aWNlcyBvZiBhbGwgcG9pbnRzIG9uIHRoZSBnZW9tZXRyeVxuICogQHBhcmFtIHtBcnJheX0gb3V0IE9wdGlvbmFsIGFycmF5IHRvIGJlIGZpbGxlZCB3aXRoIHJlc3VsdGluZyB0ZXh0dXJlIGNvb3JkaW5hdGVzLlxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBOZXcgbGlzdCBvZiBjYWxjdWxhdGVkIHRleHR1cmUgY29vcmRpbmF0ZXNcbiAqL1xuR2VvbWV0cnlIZWxwZXIuZ2V0U3BoZXJvaWRVViA9IGZ1bmN0aW9uIGdldFNwaGVyb2lkVVYodmVydGljZXMsIG91dCkge1xuICAgIG91dCA9IG91dCB8fCBbXTtcbiAgICB2YXIgbGVuZ3RoID0gdmVydGljZXMubGVuZ3RoIC8gMztcbiAgICB2YXIgdmVydGV4O1xuXG4gICAgdmFyIHV2ID0gW107XG5cbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmVydGV4ID0gb3V0cHV0c1swXS5zZXQoXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogM10sXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogMyArIDFdLFxuICAgICAgICAgICAgdmVydGljZXNbaSAqIDMgKyAyXVxuICAgICAgICApXG4gICAgICAgIC5ub3JtYWxpemUoKVxuICAgICAgICAudG9BcnJheSgpO1xuXG4gICAgICAgIHV2WzBdID0gdGhpcy5nZXRBemltdXRoKHZlcnRleCkgKiAwLjUgLyBNYXRoLlBJICsgMC41O1xuICAgICAgICB1dlsxXSA9IHRoaXMuZ2V0QWx0aXR1ZGUodmVydGV4KSAvIE1hdGguUEkgKyAwLjU7XG5cbiAgICAgICAgb3V0LnB1c2guYXBwbHkob3V0LCB1dik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbn07XG5cbi8qKlxuICogSXRlcmF0ZXMgdGhyb3VnaCBhbmQgbm9ybWFsaXplcyBhIGxpc3Qgb2YgdmVydGljZXMuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZlcnRpY2VzIFZlcnRpY2VzIG9mIGFsbCBwb2ludHMgb24gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSBvdXQgT3B0aW9uYWwgYXJyYXkgdG8gYmUgZmlsbGVkIHdpdGggcmVzdWx0aW5nIG5vcm1hbGl6ZWQgdmVjdG9ycy5cbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gTmV3IGxpc3Qgb2Ygbm9ybWFsaXplZCB2ZXJ0aWNlc1xuICovXG5HZW9tZXRyeUhlbHBlci5ub3JtYWxpemVBbGwgPSBmdW5jdGlvbiBub3JtYWxpemVBbGwodmVydGljZXMsIG91dCkge1xuICAgIG91dCA9IG91dCB8fCBbXTtcbiAgICB2YXIgbGVuID0gdmVydGljZXMubGVuZ3RoIC8gMztcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkob3V0LCBuZXcgVmVjMyh2ZXJ0aWNlc1tpICogM10sIHZlcnRpY2VzW2kgKiAzICsgMV0sIHZlcnRpY2VzW2kgKiAzICsgMl0pLm5vcm1hbGl6ZSgpLnRvQXJyYXkoKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbn07XG5cbi8qKlxuICogTm9ybWFsaXplcyBhIHNldCBvZiB2ZXJ0aWNlcyB0byBtb2RlbCBzcGFjZS5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmVydGljZXMgVmVydGljZXMgb2YgYWxsIHBvaW50cyBvbiB0aGUgZ2VvbWV0cnlcbiAqIEBwYXJhbSB7QXJyYXl9IG91dCBPcHRpb25hbCBhcnJheSB0byBiZSBmaWxsZWQgd2l0aCBtb2RlbCBzcGFjZSBwb3NpdGlvbiB2ZWN0b3JzLlxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBPdXRwdXQgdmVydGljZXMuXG4gKi9cbkdlb21ldHJ5SGVscGVyLm5vcm1hbGl6ZVZlcnRpY2VzID0gZnVuY3Rpb24gbm9ybWFsaXplVmVydGljZXModmVydGljZXMsIG91dCkge1xuICAgIG91dCA9IG91dCB8fCBbXTtcbiAgICB2YXIgbGVuID0gdmVydGljZXMubGVuZ3RoIC8gMztcbiAgICB2YXIgdmVjdG9ycyA9IFtdO1xuICAgIHZhciBtaW5YO1xuICAgIHZhciBtYXhYO1xuICAgIHZhciBtaW5ZO1xuICAgIHZhciBtYXhZO1xuICAgIHZhciBtaW5aO1xuICAgIHZhciBtYXhaO1xuICAgIHZhciB2O1xuICAgIHZhciBpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHYgPSB2ZWN0b3JzW2ldID0gbmV3IFZlYzMoXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogM10sXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogMyArIDFdLFxuICAgICAgICAgICAgdmVydGljZXNbaSAqIDMgKyAyXVxuICAgICAgICApO1xuXG4gICAgICAgIGlmIChtaW5YID09IG51bGwgfHwgdi54IDwgbWluWCkgbWluWCA9IHYueDtcbiAgICAgICAgaWYgKG1heFggPT0gbnVsbCB8fCB2LnggPiBtYXhYKSBtYXhYID0gdi54O1xuXG4gICAgICAgIGlmIChtaW5ZID09IG51bGwgfHwgdi55IDwgbWluWSkgbWluWSA9IHYueTtcbiAgICAgICAgaWYgKG1heFkgPT0gbnVsbCB8fCB2LnkgPiBtYXhZKSBtYXhZID0gdi55O1xuXG4gICAgICAgIGlmIChtaW5aID09IG51bGwgfHwgdi56IDwgbWluWikgbWluWiA9IHYuejtcbiAgICAgICAgaWYgKG1heFogPT0gbnVsbCB8fCB2LnogPiBtYXhaKSBtYXhaID0gdi56O1xuICAgIH1cblxuICAgIHZhciB0cmFuc2xhdGlvbiA9IG5ldyBWZWMzKFxuICAgICAgICBnZXRUcmFuc2xhdGlvbkZhY3RvcihtYXhYLCBtaW5YKSxcbiAgICAgICAgZ2V0VHJhbnNsYXRpb25GYWN0b3IobWF4WSwgbWluWSksXG4gICAgICAgIGdldFRyYW5zbGF0aW9uRmFjdG9yKG1heFosIG1pblopXG4gICAgKTtcblxuICAgIHZhciBzY2FsZSA9IE1hdGgubWluKFxuICAgICAgICBnZXRTY2FsZUZhY3RvcihtYXhYICsgdHJhbnNsYXRpb24ueCwgbWluWCArIHRyYW5zbGF0aW9uLngpLFxuICAgICAgICBnZXRTY2FsZUZhY3RvcihtYXhZICsgdHJhbnNsYXRpb24ueSwgbWluWSArIHRyYW5zbGF0aW9uLnkpLFxuICAgICAgICBnZXRTY2FsZUZhY3RvcihtYXhaICsgdHJhbnNsYXRpb24ueiwgbWluWiArIHRyYW5zbGF0aW9uLnopXG4gICAgKTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCB2ZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG91dC5wdXNoLmFwcGx5KG91dCwgdmVjdG9yc1tpXS5hZGQodHJhbnNsYXRpb24pLnNjYWxlKHNjYWxlKS50b0FycmF5KCkpO1xuICAgIH1cblxuICAgIHJldHVybiBvdXQ7XG59O1xuXG4vKipcbiAqIERldGVybWluZXMgdHJhbnNsYXRpb24gYW1vdW50IGZvciBhIGdpdmVuIGF4aXMgdG8gbm9ybWFsaXplIG1vZGVsIGNvb3JkaW5hdGVzLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1heCBNYXhpbXVtIHBvc2l0aW9uIHZhbHVlIG9mIGdpdmVuIGF4aXMgb24gdGhlIG1vZGVsLlxuICogQHBhcmFtIHtOdW1iZXJ9IG1pbiBNaW5pbXVtIHBvc2l0aW9uIHZhbHVlIG9mIGdpdmVuIGF4aXMgb24gdGhlIG1vZGVsLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gTnVtYmVyIGJ5IHdoaWNoIHRoZSBnaXZlbiBheGlzIHNob3VsZCBiZSB0cmFuc2xhdGVkIGZvciBhbGwgdmVydGljZXMuXG4gKi9cbmZ1bmN0aW9uIGdldFRyYW5zbGF0aW9uRmFjdG9yKG1heCwgbWluKSB7XG4gICAgcmV0dXJuIC0obWluICsgKG1heCAtIG1pbikgLyAyKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHNjYWxlIGFtb3VudCBmb3IgYSBnaXZlbiBheGlzIHRvIG5vcm1hbGl6ZSBtb2RlbCBjb29yZGluYXRlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBtYXggTWF4aW11bSBzY2FsZSB2YWx1ZSBvZiBnaXZlbiBheGlzIG9uIHRoZSBtb2RlbC5cbiAqIEBwYXJhbSB7TnVtYmVyfSBtaW4gTWluaW11bSBzY2FsZSB2YWx1ZSBvZiBnaXZlbiBheGlzIG9uIHRoZSBtb2RlbC5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IE51bWJlciBieSB3aGljaCB0aGUgZ2l2ZW4gYXhpcyBzaG91bGQgYmUgc2NhbGVkIGZvciBhbGwgdmVydGljZXMuXG4gKi9cbmZ1bmN0aW9uIGdldFNjYWxlRmFjdG9yKG1heCwgbWluKSB7XG4gICAgcmV0dXJuIDEgLyAoKG1heCAtIG1pbikgLyAyKTtcbn1cblxuLyoqXG4gKiBGaW5kcyB0aGUgYXppbXV0aCwgb3IgYW5nbGUgYWJvdmUgdGhlIFhZIHBsYW5lLCBvZiBhIGdpdmVuIHZlY3Rvci5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdiBWZXJ0ZXggdG8gcmV0cmVpdmUgYXppbXV0aCBmcm9tLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gQXppbXV0aCB2YWx1ZSBpbiByYWRpYW5zLlxuICovXG5HZW9tZXRyeUhlbHBlci5nZXRBemltdXRoID0gZnVuY3Rpb24gYXppbXV0aCh2KSB7XG4gICAgcmV0dXJuIE1hdGguYXRhbjIodlsyXSwgLXZbMF0pO1xufTtcblxuLyoqXG4gKiBGaW5kcyB0aGUgYWx0aXR1ZGUsIG9yIGFuZ2xlIGFib3ZlIHRoZSBYWiBwbGFuZSwgb2YgYSBnaXZlbiB2ZWN0b3IuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHYgVmVydGV4IHRvIHJldHJlaXZlIGFsdGl0dWRlIGZyb20uXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSBBbHRpdHVkZSB2YWx1ZSBpbiByYWRpYW5zLlxuICovXG5HZW9tZXRyeUhlbHBlci5nZXRBbHRpdHVkZSA9IGZ1bmN0aW9uIGFsdGl0dWRlKHYpIHtcbiAgICByZXR1cm4gTWF0aC5hdGFuMigtdlsxXSwgTWF0aC5zcXJ0KCh2WzBdICogdlswXSkgKyAodlsyXSAqIHZbMl0pKSk7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIGEgbGlzdCBvZiBpbmRpY2VzIGZyb20gJ3RyaWFuZ2xlJyB0byAnbGluZScgZm9ybWF0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBpbmRpY2VzIEluZGljZXMgb2YgYWxsIGZhY2VzIG9uIHRoZSBnZW9tZXRyeVxuICogQHBhcmFtIHtBcnJheX0gb3V0IEluZGljZXMgb2YgYWxsIGZhY2VzIG9uIHRoZSBnZW9tZXRyeVxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBOZXcgbGlzdCBvZiBsaW5lLWZvcm1hdHRlZCBpbmRpY2VzXG4gKi9cbkdlb21ldHJ5SGVscGVyLnRyaWFuZ2xlc1RvTGluZXMgPSBmdW5jdGlvbiB0cmlhbmdsZVRvTGluZXMoaW5kaWNlcywgb3V0KSB7XG4gICAgdmFyIG51bVZlY3RvcnMgPSBpbmRpY2VzLmxlbmd0aCAvIDM7XG4gICAgb3V0ID0gb3V0IHx8IFtdO1xuICAgIHZhciBpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IG51bVZlY3RvcnM7IGkrKykge1xuICAgICAgICBvdXQucHVzaChpbmRpY2VzW2kgKiAzICsgMF0sIGluZGljZXNbaSAqIDMgKyAxXSk7XG4gICAgICAgIG91dC5wdXNoKGluZGljZXNbaSAqIDMgKyAxXSwgaW5kaWNlc1tpICogMyArIDJdKTtcbiAgICAgICAgb3V0LnB1c2goaW5kaWNlc1tpICogMyArIDJdLCBpbmRpY2VzW2kgKiAzICsgMF0pO1xuICAgIH1cblxuICAgIHJldHVybiBvdXQ7XG59O1xuXG4vKipcbiAqIEFkZHMgYSByZXZlcnNlIG9yZGVyIHRyaWFuZ2xlIGZvciBldmVyeSB0cmlhbmdsZSBpbiB0aGUgbWVzaC4gQWRkcyBleHRyYSB2ZXJ0aWNlc1xuICogYW5kIGluZGljZXMgdG8gaW5wdXQgYXJyYXlzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2ZXJ0aWNlcyBYLCBZLCBaIHBvc2l0aW9ucyBvZiBhbGwgdmVydGljZXMgaW4gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSBpbmRpY2VzIEluZGljZXMgb2YgYWxsIGZhY2VzIG9uIHRoZSBnZW9tZXRyeVxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuR2VvbWV0cnlIZWxwZXIuYWRkQmFja2ZhY2VUcmlhbmdsZXMgPSBmdW5jdGlvbiBhZGRCYWNrZmFjZVRyaWFuZ2xlcyh2ZXJ0aWNlcywgaW5kaWNlcykge1xuICAgIHZhciBuRmFjZXMgPSBpbmRpY2VzLmxlbmd0aCAvIDM7XG5cbiAgICB2YXIgbWF4SW5kZXggPSAwO1xuICAgIHZhciBpID0gaW5kaWNlcy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkgaWYgKGluZGljZXNbaV0gPiBtYXhJbmRleCkgbWF4SW5kZXggPSBpbmRpY2VzW2ldO1xuXG4gICAgbWF4SW5kZXgrKztcblxuICAgIGZvciAoaSA9IDA7IGkgPCBuRmFjZXM7IGkrKykge1xuICAgICAgICB2YXIgaW5kZXhPbmUgPSBpbmRpY2VzW2kgKiAzXSxcbiAgICAgICAgICAgIGluZGV4VHdvID0gaW5kaWNlc1tpICogMyArIDFdLFxuICAgICAgICAgICAgaW5kZXhUaHJlZSA9IGluZGljZXNbaSAqIDMgKyAyXTtcblxuICAgICAgICBpbmRpY2VzLnB1c2goaW5kZXhPbmUgKyBtYXhJbmRleCwgaW5kZXhUaHJlZSArIG1heEluZGV4LCBpbmRleFR3byArIG1heEluZGV4KTtcbiAgICB9XG5cbiAgICAvLyBJdGVyYXRpbmcgaW5zdGVhZCBvZiAuc2xpY2UoKSBoZXJlIHRvIGF2b2lkIG1heCBjYWxsIHN0YWNrIGlzc3VlLlxuXG4gICAgdmFyIG5WZXJ0cyA9IHZlcnRpY2VzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgblZlcnRzOyBpKyspIHtcbiAgICAgICAgdmVydGljZXMucHVzaCh2ZXJ0aWNlc1tpXSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBHZW9tZXRyeUhlbHBlcjtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEdlb21ldHJ5ID0gcmVxdWlyZSgnLi4vR2VvbWV0cnknKTtcbnZhciBHZW9tZXRyeUhlbHBlciA9IHJlcXVpcmUoJy4uL0dlb21ldHJ5SGVscGVyJyk7XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiByZXR1cm5zIGEgbmV3IHN0YXRpYyBnZW9tZXRyeSwgd2hpY2ggaXMgcGFzc2VkXG4gKiBjdXN0b20gYnVmZmVyIGRhdGEuXG4gKlxuICogQGNsYXNzIFBsYW5lXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBQYXJhbWV0ZXJzIHRoYXQgYWx0ZXIgdGhlXG4gKiB2ZXJ0ZXggYnVmZmVycyBvZiB0aGUgZ2VuZXJhdGVkIGdlb21ldHJ5LlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gY29uc3RydWN0ZWQgZ2VvbWV0cnlcbiAqL1xuZnVuY3Rpb24gUGxhbmUob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBkZXRhaWxYID0gb3B0aW9ucy5kZXRhaWxYIHx8IG9wdGlvbnMuZGV0YWlsIHx8IDE7XG4gICAgdmFyIGRldGFpbFkgPSBvcHRpb25zLmRldGFpbFkgfHwgb3B0aW9ucy5kZXRhaWwgfHwgMTtcblxuICAgIHZhciB2ZXJ0aWNlcyAgICAgID0gW107XG4gICAgdmFyIHRleHR1cmVDb29yZHMgPSBbXTtcbiAgICB2YXIgbm9ybWFscyAgICAgICA9IFtdO1xuICAgIHZhciBpbmRpY2VzICAgICAgID0gW107XG5cbiAgICB2YXIgaTtcblxuICAgIGZvciAodmFyIHkgPSAwOyB5IDw9IGRldGFpbFk7IHkrKykge1xuICAgICAgICB2YXIgdCA9IHkgLyBkZXRhaWxZO1xuICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8PSBkZXRhaWxYOyB4KyspIHtcbiAgICAgICAgICAgIHZhciBzID0geCAvIGRldGFpbFg7XG4gICAgICAgICAgICB2ZXJ0aWNlcy5wdXNoKDIuICogKHMgLSAuNSksIDIgKiAodCAtIC41KSwgMCk7XG4gICAgICAgICAgICB0ZXh0dXJlQ29vcmRzLnB1c2gocywgMSAtIHQpO1xuICAgICAgICAgICAgaWYgKHggPCBkZXRhaWxYICYmIHkgPCBkZXRhaWxZKSB7XG4gICAgICAgICAgICAgICAgaSA9IHggKyB5ICogKGRldGFpbFggKyAxKTtcbiAgICAgICAgICAgICAgICBpbmRpY2VzLnB1c2goaSwgaSArIDEsIGkgKyBkZXRhaWxYICsgMSk7XG4gICAgICAgICAgICAgICAgaW5kaWNlcy5wdXNoKGkgKyBkZXRhaWxYICsgMSwgaSArIDEsIGkgKyBkZXRhaWxYICsgMik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5iYWNrZmFjZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgR2VvbWV0cnlIZWxwZXIuYWRkQmFja2ZhY2VUcmlhbmdsZXModmVydGljZXMsIGluZGljZXMpO1xuXG4gICAgICAgIC8vIGR1cGxpY2F0ZSB0ZXh0dXJlIGNvb3JkaW5hdGVzIGFzIHdlbGxcblxuICAgICAgICB2YXIgbGVuID0gdGV4dHVyZUNvb3Jkcy5sZW5ndGg7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykgdGV4dHVyZUNvb3Jkcy5wdXNoKHRleHR1cmVDb29yZHNbaV0pO1xuICAgIH1cblxuICAgIG5vcm1hbHMgPSBHZW9tZXRyeUhlbHBlci5jb21wdXRlTm9ybWFscyh2ZXJ0aWNlcywgaW5kaWNlcyk7XG5cbiAgICByZXR1cm4gbmV3IEdlb21ldHJ5KHtcbiAgICAgICAgYnVmZmVyczogW1xuICAgICAgICAgICAgeyBuYW1lOiAnYV9wb3MnLCBkYXRhOiB2ZXJ0aWNlcyB9LFxuICAgICAgICAgICAgeyBuYW1lOiAnYV90ZXhDb29yZCcsIGRhdGE6IHRleHR1cmVDb29yZHMsIHNpemU6IDIgfSxcbiAgICAgICAgICAgIHsgbmFtZTogJ2Ffbm9ybWFscycsIGRhdGE6IG5vcm1hbHMgfSxcbiAgICAgICAgICAgIHsgbmFtZTogJ2luZGljZXMnLCBkYXRhOiBpbmRpY2VzLCBzaXplOiAxIH1cbiAgICAgICAgXVxuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBsYW5lO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEJ1ZmZlciBpcyBhIHByaXZhdGUgY2xhc3MgdGhhdCB3cmFwcyB0aGUgdmVydGV4IGRhdGEgdGhhdCBkZWZpbmVzXG4gKiB0aGUgdGhlIHBvaW50cyBvZiB0aGUgdHJpYW5nbGVzIHRoYXQgd2ViZ2wgZHJhd3MuIEVhY2ggYnVmZmVyXG4gKiBtYXBzIHRvIG9uZSBhdHRyaWJ1dGUgb2YgYSBtZXNoLlxuICpcbiAqIEBjbGFzcyBCdWZmZXJcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0YXJnZXQgVGhlIGJpbmQgdGFyZ2V0IG9mIHRoZSBidWZmZXIgdG8gdXBkYXRlOiBBUlJBWV9CVUZGRVIgb3IgRUxFTUVOVF9BUlJBWV9CVUZGRVJcbiAqIEBwYXJhbSB7T2JqZWN0fSB0eXBlIEFycmF5IHR5cGUgdG8gYmUgdXNlZCBpbiBjYWxscyB0byBnbC5idWZmZXJEYXRhLlxuICogQHBhcmFtIHtXZWJHTENvbnRleHR9IGdsIFRoZSBXZWJHTCBjb250ZXh0IHRoYXQgdGhlIGJ1ZmZlciBpcyBob3N0ZWQgYnkuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gQnVmZmVyKHRhcmdldCwgdHlwZSwgZ2wpIHtcbiAgICB0aGlzLmJ1ZmZlciA9IG51bGw7XG4gICAgdGhpcy50YXJnZXQgPSB0YXJnZXQ7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLmRhdGEgPSBbXTtcbiAgICB0aGlzLmdsID0gZ2w7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIFdlYkdMIGJ1ZmZlciBpZiBvbmUgZG9lcyBub3QgeWV0IGV4aXN0IGFuZCBiaW5kcyB0aGUgYnVmZmVyIHRvXG4gKiB0byB0aGUgY29udGV4dC4gUnVucyBidWZmZXJEYXRhIHdpdGggYXBwcm9wcmlhdGUgZGF0YS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQnVmZmVyLnByb3RvdHlwZS5zdWJEYXRhID0gZnVuY3Rpb24gc3ViRGF0YSgpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIHZhciBkYXRhID0gW107XG5cbiAgICAvLyB0byBwcmV2ZW50IGFnYWluc3QgbWF4aW11bSBjYWxsLXN0YWNrIGlzc3VlLlxuICAgIGZvciAodmFyIGkgPSAwLCBjaHVuayA9IDEwMDAwOyBpIDwgdGhpcy5kYXRhLmxlbmd0aDsgaSArPSBjaHVuaylcbiAgICAgICAgZGF0YSA9IEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoZGF0YSwgdGhpcy5kYXRhLnNsaWNlKGksIGkgKyBjaHVuaykpO1xuXG4gICAgdGhpcy5idWZmZXIgPSB0aGlzLmJ1ZmZlciB8fCBnbC5jcmVhdGVCdWZmZXIoKTtcbiAgICBnbC5iaW5kQnVmZmVyKHRoaXMudGFyZ2V0LCB0aGlzLmJ1ZmZlcik7XG4gICAgZ2wuYnVmZmVyRGF0YSh0aGlzLnRhcmdldCwgbmV3IHRoaXMudHlwZShkYXRhKSwgZ2wuU1RBVElDX0RSQVcpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCdWZmZXI7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBJTkRJQ0VTID0gJ2luZGljZXMnO1xuXG52YXIgQnVmZmVyID0gcmVxdWlyZSgnLi9CdWZmZXInKTtcblxuLyoqXG4gKiBCdWZmZXJSZWdpc3RyeSBpcyBhIGNsYXNzIHRoYXQgbWFuYWdlcyBhbGxvY2F0aW9uIG9mIGJ1ZmZlcnMgdG9cbiAqIGlucHV0IGdlb21ldHJpZXMuXG4gKlxuICogQGNsYXNzIEJ1ZmZlclJlZ2lzdHJ5XG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1dlYkdMQ29udGV4dH0gY29udGV4dCBXZWJHTCBkcmF3aW5nIGNvbnRleHQgdG8gYmUgcGFzc2VkIHRvIGJ1ZmZlcnMuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gQnVmZmVyUmVnaXN0cnkoY29udGV4dCkge1xuICAgIHRoaXMuZ2wgPSBjb250ZXh0O1xuXG4gICAgdGhpcy5yZWdpc3RyeSA9IHt9O1xuICAgIHRoaXMuX2R5bmFtaWNCdWZmZXJzID0gW107XG4gICAgdGhpcy5fc3RhdGljQnVmZmVycyA9IFtdO1xuXG4gICAgdGhpcy5fYXJyYXlCdWZmZXJNYXggPSAzMDAwMDtcbiAgICB0aGlzLl9lbGVtZW50QnVmZmVyTWF4ID0gMzAwMDA7XG59XG5cbi8qKlxuICogQmluZHMgYW5kIGZpbGxzIGFsbCB0aGUgdmVydGV4IGRhdGEgaW50byB3ZWJnbCBidWZmZXJzLiAgV2lsbCByZXVzZSBidWZmZXJzIGlmXG4gKiBwb3NzaWJsZS4gIFBvcHVsYXRlcyByZWdpc3RyeSB3aXRoIHRoZSBuYW1lIG9mIHRoZSBidWZmZXIsIHRoZSBXZWJHTCBidWZmZXJcbiAqIG9iamVjdCwgc3BhY2luZyBvZiB0aGUgYXR0cmlidXRlLCB0aGUgYXR0cmlidXRlJ3Mgb2Zmc2V0IHdpdGhpbiB0aGUgYnVmZmVyLFxuICogYW5kIGZpbmFsbHkgdGhlIGxlbmd0aCBvZiB0aGUgYnVmZmVyLiAgVGhpcyBpbmZvcm1hdGlvbiBpcyBsYXRlciBhY2Nlc3NlZCBieVxuICogdGhlIHJvb3QgdG8gZHJhdyB0aGUgYnVmZmVycy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGdlb21ldHJ5SWQgSWQgb2YgdGhlIGdlb21ldHJ5IGluc3RhbmNlIHRoYXQgaG9sZHMgdGhlIGJ1ZmZlcnMuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBLZXkgb2YgdGhlIGlucHV0IGJ1ZmZlciBpbiB0aGUgZ2VvbWV0cnkuXG4gKiBAcGFyYW0ge0FycmF5fSB2YWx1ZSBGbGF0IGFycmF5IGNvbnRhaW5pbmcgaW5wdXQgZGF0YSBmb3IgYnVmZmVyLlxuICogQHBhcmFtIHtOdW1iZXJ9IHNwYWNpbmcgVGhlIHNwYWNpbmcsIG9yIGl0ZW1TaXplLCBvZiB0aGUgaW5wdXQgYnVmZmVyLlxuICogQHBhcmFtIHtCb29sZWFufSBkeW5hbWljIEJvb2xlYW4gZGVub3Rpbmcgd2hldGhlciBhIGdlb21ldHJ5IGlzIGR5bmFtaWMgb3Igc3RhdGljLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkJ1ZmZlclJlZ2lzdHJ5LnByb3RvdHlwZS5hbGxvY2F0ZSA9IGZ1bmN0aW9uIGFsbG9jYXRlKGdlb21ldHJ5SWQsIG5hbWUsIHZhbHVlLCBzcGFjaW5nLCBkeW5hbWljKSB7XG4gICAgdmFyIHZlcnRleEJ1ZmZlcnMgPSB0aGlzLnJlZ2lzdHJ5W2dlb21ldHJ5SWRdIHx8ICh0aGlzLnJlZ2lzdHJ5W2dlb21ldHJ5SWRdID0geyBrZXlzOiBbXSwgdmFsdWVzOiBbXSwgc3BhY2luZzogW10sIG9mZnNldDogW10sIGxlbmd0aDogW10gfSk7XG5cbiAgICB2YXIgaiA9IHZlcnRleEJ1ZmZlcnMua2V5cy5pbmRleE9mKG5hbWUpO1xuICAgIHZhciBpc0luZGV4ID0gbmFtZSA9PT0gSU5ESUNFUztcbiAgICB2YXIgYnVmZmVyRm91bmQgPSBmYWxzZTtcbiAgICB2YXIgbmV3T2Zmc2V0O1xuICAgIHZhciBvZmZzZXQgPSAwO1xuICAgIHZhciBsZW5ndGg7XG4gICAgdmFyIGJ1ZmZlcjtcbiAgICB2YXIgaztcblxuICAgIGlmIChqID09PSAtMSkge1xuICAgICAgICBqID0gdmVydGV4QnVmZmVycy5rZXlzLmxlbmd0aDtcbiAgICAgICAgbGVuZ3RoID0gaXNJbmRleCA/IHZhbHVlLmxlbmd0aCA6IE1hdGguZmxvb3IodmFsdWUubGVuZ3RoIC8gc3BhY2luZyk7XG5cbiAgICAgICAgaWYgKCFkeW5hbWljKSB7XG5cbiAgICAgICAgICAgIC8vIFVzZSBhIHByZXZpb3VzbHkgY3JlYXRlZCBidWZmZXIgaWYgYXZhaWxhYmxlLlxuXG4gICAgICAgICAgICBmb3IgKGsgPSAwOyBrIDwgdGhpcy5fc3RhdGljQnVmZmVycy5sZW5ndGg7IGsrKykge1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzSW5kZXggPT09IHRoaXMuX3N0YXRpY0J1ZmZlcnNba10uaXNJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBuZXdPZmZzZXQgPSB0aGlzLl9zdGF0aWNCdWZmZXJzW2tdLm9mZnNldCArIHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCghaXNJbmRleCAmJiBuZXdPZmZzZXQgPCB0aGlzLl9hcnJheUJ1ZmZlck1heCkgfHwgKGlzSW5kZXggJiYgbmV3T2Zmc2V0IDwgdGhpcy5fZWxlbWVudEJ1ZmZlck1heCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlciA9IHRoaXMuX3N0YXRpY0J1ZmZlcnNba10uYnVmZmVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ID0gdGhpcy5fc3RhdGljQnVmZmVyc1trXS5vZmZzZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zdGF0aWNCdWZmZXJzW2tdLm9mZnNldCArPSB2YWx1ZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXJGb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgbmV3IHN0YXRpYyBidWZmZXIgaW4gbm9uZSB3ZXJlIGZvdW5kLlxuXG4gICAgICAgICAgICBpZiAoIWJ1ZmZlckZvdW5kKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyID0gbmV3IEJ1ZmZlcihcbiAgICAgICAgICAgICAgICAgICAgaXNJbmRleCA/IHRoaXMuZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIgOiB0aGlzLmdsLkFSUkFZX0JVRkZFUixcbiAgICAgICAgICAgICAgICAgICAgaXNJbmRleCA/IFVpbnQxNkFycmF5IDogRmxvYXQzMkFycmF5LFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmdsXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRpY0J1ZmZlcnMucHVzaCh7IGJ1ZmZlcjogYnVmZmVyLCBvZmZzZXQ6IHZhbHVlLmxlbmd0aCwgaXNJbmRleDogaXNJbmRleCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcblxuICAgICAgICAgICAgLy8gRm9yIGR5bmFtaWMgZ2VvbWV0cmllcywgYWx3YXlzIGNyZWF0ZSBuZXcgYnVmZmVyLlxuXG4gICAgICAgICAgICBidWZmZXIgPSBuZXcgQnVmZmVyKFxuICAgICAgICAgICAgICAgIGlzSW5kZXggPyB0aGlzLmdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSIDogdGhpcy5nbC5BUlJBWV9CVUZGRVIsXG4gICAgICAgICAgICAgICAgaXNJbmRleCA/IFVpbnQxNkFycmF5IDogRmxvYXQzMkFycmF5LFxuICAgICAgICAgICAgICAgIHRoaXMuZ2xcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHRoaXMuX2R5bmFtaWNCdWZmZXJzLnB1c2goeyBidWZmZXI6IGJ1ZmZlciwgb2Zmc2V0OiB2YWx1ZS5sZW5ndGgsIGlzSW5kZXg6IGlzSW5kZXggfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgdGhlIHJlZ2lzdHJ5IGZvciB0aGUgc3BlYyB3aXRoIGJ1ZmZlciBpbmZvcm1hdGlvbi5cblxuICAgICAgICB2ZXJ0ZXhCdWZmZXJzLmtleXMucHVzaChuYW1lKTtcbiAgICAgICAgdmVydGV4QnVmZmVycy52YWx1ZXMucHVzaChidWZmZXIpO1xuICAgICAgICB2ZXJ0ZXhCdWZmZXJzLnNwYWNpbmcucHVzaChzcGFjaW5nKTtcbiAgICAgICAgdmVydGV4QnVmZmVycy5vZmZzZXQucHVzaChvZmZzZXQpO1xuICAgICAgICB2ZXJ0ZXhCdWZmZXJzLmxlbmd0aC5wdXNoKGxlbmd0aCk7XG4gICAgfVxuXG4gICAgdmFyIGxlbiA9IHZhbHVlLmxlbmd0aDtcbiAgICBmb3IgKGsgPSAwOyBrIDwgbGVuOyBrKyspIHtcbiAgICAgICAgdmVydGV4QnVmZmVycy52YWx1ZXNbal0uZGF0YVtvZmZzZXQgKyBrXSA9IHZhbHVlW2tdO1xuICAgIH1cbiAgICB2ZXJ0ZXhCdWZmZXJzLnZhbHVlc1tqXS5zdWJEYXRhKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJ1ZmZlclJlZ2lzdHJ5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4vKipcbiAqIFRha2VzIHRoZSBvcmlnaW5hbCByZW5kZXJpbmcgY29udGV4dHMnIGNvbXBpbGVyIGZ1bmN0aW9uXG4gKiBhbmQgYXVnbWVudHMgaXQgd2l0aCBhZGRlZCBmdW5jdGlvbmFsaXR5IGZvciBwYXJzaW5nIGFuZFxuICogZGlzcGxheWluZyBlcnJvcnMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gQXVnbWVudGVkIGZ1bmN0aW9uXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gRGVidWcoKSB7XG4gICAgcmV0dXJuIF9hdWdtZW50RnVuY3Rpb24oXG4gICAgICAgIHRoaXMuZ2wuY29tcGlsZVNoYWRlcixcbiAgICAgICAgZnVuY3Rpb24oc2hhZGVyKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZ2V0U2hhZGVyUGFyYW1ldGVyKHNoYWRlciwgdGhpcy5DT01QSUxFX1NUQVRVUykpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3JzID0gdGhpcy5nZXRTaGFkZXJJbmZvTG9nKHNoYWRlcik7XG4gICAgICAgICAgICAgICAgdmFyIHNvdXJjZSA9IHRoaXMuZ2V0U2hhZGVyU291cmNlKHNoYWRlcik7XG4gICAgICAgICAgICAgICAgX3Byb2Nlc3NFcnJvcnMoZXJyb3JzLCBzb3VyY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn07XG5cbi8vIFRha2VzIGEgZnVuY3Rpb24sIGtlZXBzIHRoZSByZWZlcmVuY2UgYW5kIHJlcGxhY2VzIGl0IGJ5IGEgY2xvc3VyZSB0aGF0XG4vLyBleGVjdXRlcyB0aGUgb3JpZ2luYWwgZnVuY3Rpb24gYW5kIHRoZSBwcm92aWRlZCBjYWxsYmFjay5cbmZ1bmN0aW9uIF9hdWdtZW50RnVuY3Rpb24oZnVuYywgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZXMgPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcbn1cblxuLy8gUGFyc2VzIGVycm9ycyBhbmQgZmFpbGVkIHNvdXJjZSBjb2RlIGZyb20gc2hhZGVycyBpbiBvcmRlclxuLy8gdG8gYnVpbGQgZGlzcGxheWFibGUgZXJyb3IgYmxvY2tzLlxuLy8gSW5zcGlyZWQgYnkgSmF1bWUgU2FuY2hleiBFbGlhcy5cbmZ1bmN0aW9uIF9wcm9jZXNzRXJyb3JzKGVycm9ycywgc291cmNlKSB7XG5cbiAgICB2YXIgY3NzID0gJ2JvZHksaHRtbHtiYWNrZ3JvdW5kOiNlM2UzZTM7Zm9udC1mYW1pbHk6bW9uYWNvLG1vbm9zcGFjZTtmb250LXNpemU6MTRweDtsaW5lLWhlaWdodDoxLjdlbX0nICtcbiAgICAgICAgICAgICAgJyNzaGFkZXJSZXBvcnR7bGVmdDowO3RvcDowO3JpZ2h0OjA7Ym94LXNpemluZzpib3JkZXItYm94O3Bvc2l0aW9uOmFic29sdXRlO3otaW5kZXg6MTAwMDtjb2xvcjonICtcbiAgICAgICAgICAgICAgJyMyMjI7cGFkZGluZzoxNXB4O3doaXRlLXNwYWNlOm5vcm1hbDtsaXN0LXN0eWxlLXR5cGU6bm9uZTttYXJnaW46NTBweCBhdXRvO21heC13aWR0aDoxMjAwcHh9JyArXG4gICAgICAgICAgICAgICcjc2hhZGVyUmVwb3J0IGxpe2JhY2tncm91bmQtY29sb3I6I2ZmZjttYXJnaW46MTNweCAwO2JveC1zaGFkb3c6MCAxcHggMnB4IHJnYmEoMCwwLDAsLjE1KTsnICtcbiAgICAgICAgICAgICAgJ3BhZGRpbmc6MjBweCAzMHB4O2JvcmRlci1yYWRpdXM6MnB4O2JvcmRlci1sZWZ0OjIwcHggc29saWQgI2UwMTExMX1zcGFue2NvbG9yOiNlMDExMTE7JyArXG4gICAgICAgICAgICAgICd0ZXh0LWRlY29yYXRpb246dW5kZXJsaW5lO2ZvbnQtd2VpZ2h0OjcwMH0jc2hhZGVyUmVwb3J0IGxpIHB7cGFkZGluZzowO21hcmdpbjowfScgK1xuICAgICAgICAgICAgICAnI3NoYWRlclJlcG9ydCBsaTpudGgtY2hpbGQoZXZlbil7YmFja2dyb3VuZC1jb2xvcjojZjRmNGY0fScgK1xuICAgICAgICAgICAgICAnI3NoYWRlclJlcG9ydCBsaSBwOmZpcnN0LWNoaWxke21hcmdpbi1ib3R0b206MTBweDtjb2xvcjojNjY2fSc7XG5cbiAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQoZWwpO1xuICAgIGVsLnRleHRDb250ZW50ID0gY3NzO1xuXG4gICAgdmFyIHJlcG9ydCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3VsJyk7XG4gICAgcmVwb3J0LnNldEF0dHJpYnV0ZSgnaWQnLCAnc2hhZGVyUmVwb3J0Jyk7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChyZXBvcnQpO1xuXG4gICAgdmFyIHJlID0gL0VSUk9SOiBbXFxkXSs6KFtcXGRdKyk6ICguKykvZ21pO1xuICAgIHZhciBsaW5lcyA9IHNvdXJjZS5zcGxpdCgnXFxuJyk7XG5cbiAgICB2YXIgbTtcbiAgICB3aGlsZSAoKG0gPSByZS5leGVjKGVycm9ycykpICE9IG51bGwpIHtcbiAgICAgICAgaWYgKG0uaW5kZXggPT09IHJlLmxhc3RJbmRleCkgcmUubGFzdEluZGV4Kys7XG4gICAgICAgIHZhciBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICAgIHZhciBjb2RlID0gJzxwPjxzcGFuPkVSUk9SPC9zcGFuPiBcIicgKyBtWzJdICsgJ1wiIGluIGxpbmUgJyArIG1bMV0gKyAnPC9wPic7XG4gICAgICAgIGNvZGUgKz0gJzxwPjxiPicgKyBsaW5lc1ttWzFdIC0gMV0ucmVwbGFjZSgvXlsgXFx0XSsvZywgJycpICsgJzwvYj48L3A+JztcbiAgICAgICAgbGkuaW5uZXJIVE1MID0gY29kZTtcbiAgICAgICAgcmVwb3J0LmFwcGVuZENoaWxkKGxpKTtcbiAgICB9XG59XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBjbG9uZSA9IHJlcXVpcmUoJy4uL3V0aWxpdGllcy9jbG9uZScpO1xudmFyIGtleVZhbHVlVG9BcnJheXMgPSByZXF1aXJlKCcuLi91dGlsaXRpZXMva2V5VmFsdWVUb0FycmF5cycpO1xuXG52YXIgdmVydGV4V3JhcHBlciA9IHJlcXVpcmUoJy4uL3dlYmdsLXNoYWRlcnMnKS52ZXJ0ZXg7XG52YXIgZnJhZ21lbnRXcmFwcGVyID0gcmVxdWlyZSgnLi4vd2ViZ2wtc2hhZGVycycpLmZyYWdtZW50O1xudmFyIERlYnVnID0gcmVxdWlyZSgnLi9EZWJ1ZycpO1xuXG52YXIgVkVSVEVYX1NIQURFUiA9IDM1NjMzO1xudmFyIEZSQUdNRU5UX1NIQURFUiA9IDM1NjMyO1xudmFyIGlkZW50aXR5TWF0cml4ID0gWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdO1xuXG52YXIgaGVhZGVyID0gJ3ByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1xcbic7XG5cbnZhciBUWVBFUyA9IHtcbiAgICB1bmRlZmluZWQ6ICdmbG9hdCAnLFxuICAgIDE6ICdmbG9hdCAnLFxuICAgIDI6ICd2ZWMyICcsXG4gICAgMzogJ3ZlYzMgJyxcbiAgICA0OiAndmVjNCAnLFxuICAgIDE2OiAnbWF0NCAnXG59O1xuXG52YXIgaW5wdXRUeXBlcyA9IHtcbiAgICB1X2Jhc2VDb2xvcjogJ3ZlYzQnLFxuICAgIHVfbm9ybWFsczogJ3ZlcnQnLFxuICAgIHVfZ2xvc3NpbmVzczogJ3ZlYzQnLFxuICAgIHVfcG9zaXRpb25PZmZzZXQ6ICd2ZXJ0J1xufTtcblxudmFyIG1hc2tzID0gIHtcbiAgICB2ZXJ0OiAxLFxuICAgIHZlYzM6IDIsXG4gICAgdmVjNDogNCxcbiAgICBmbG9hdDogOFxufTtcblxuLyoqXG4gKiBVbmlmb3JtIGtleXMgYW5kIHZhbHVlc1xuICovXG52YXIgdW5pZm9ybXMgPSBrZXlWYWx1ZVRvQXJyYXlzKHtcbiAgICB1X3BlcnNwZWN0aXZlOiBpZGVudGl0eU1hdHJpeCxcbiAgICB1X3ZpZXc6IGlkZW50aXR5TWF0cml4LFxuICAgIHVfcmVzb2x1dGlvbjogWzAsIDAsIDBdLFxuICAgIHVfdHJhbnNmb3JtOiBpZGVudGl0eU1hdHJpeCxcbiAgICB1X3NpemU6IFsxLCAxLCAxXSxcbiAgICB1X3RpbWU6IDAsXG4gICAgdV9vcGFjaXR5OiAxLFxuICAgIHVfbWV0YWxuZXNzOiAwLFxuICAgIHVfZ2xvc3NpbmVzczogWzAsIDAsIDAsIDBdLFxuICAgIHVfYmFzZUNvbG9yOiBbMSwgMSwgMSwgMV0sXG4gICAgdV9ub3JtYWxzOiBbMSwgMSwgMV0sXG4gICAgdV9wb3NpdGlvbk9mZnNldDogWzAsIDAsIDBdLFxuICAgIHVfbGlnaHRQb3NpdGlvbjogaWRlbnRpdHlNYXRyaXgsXG4gICAgdV9saWdodENvbG9yOiBpZGVudGl0eU1hdHJpeCxcbiAgICB1X2FtYmllbnRMaWdodDogWzAsIDAsIDBdLFxuICAgIHVfZmxhdFNoYWRpbmc6IDAsXG4gICAgdV9udW1MaWdodHM6IDBcbn0pO1xuXG4vKipcbiAqIEF0dHJpYnV0ZXMga2V5cyBhbmQgdmFsdWVzXG4gKi9cbnZhciBhdHRyaWJ1dGVzID0ga2V5VmFsdWVUb0FycmF5cyh7XG4gICAgYV9wb3M6IFswLCAwLCAwXSxcbiAgICBhX3RleENvb3JkOiBbMCwgMF0sXG4gICAgYV9ub3JtYWxzOiBbMCwgMCwgMF1cbn0pO1xuXG4vKipcbiAqIFZhcnlpbmdzIGtleXMgYW5kIHZhbHVlc1xuICovXG52YXIgdmFyeWluZ3MgPSBrZXlWYWx1ZVRvQXJyYXlzKHtcbiAgICB2X3RleHR1cmVDb29yZGluYXRlOiBbMCwgMF0sXG4gICAgdl9ub3JtYWw6IFswLCAwLCAwXSxcbiAgICB2X3Bvc2l0aW9uOiBbMCwgMCwgMF0sXG4gICAgdl9leWVWZWN0b3I6IFswLCAwLCAwXVxufSk7XG5cbi8qKlxuICogQSBjbGFzcyB0aGF0IGhhbmRsZXMgaW50ZXJhY3Rpb25zIHdpdGggdGhlIFdlYkdMIHNoYWRlciBwcm9ncmFtXG4gKiB1c2VkIGJ5IGEgc3BlY2lmaWMgY29udGV4dC4gIEl0IG1hbmFnZXMgY3JlYXRpb24gb2YgdGhlIHNoYWRlciBwcm9ncmFtXG4gKiBhbmQgdGhlIGF0dGFjaGVkIHZlcnRleCBhbmQgZnJhZ21lbnQgc2hhZGVycy4gIEl0IGlzIGFsc28gaW4gY2hhcmdlIG9mXG4gKiBwYXNzaW5nIGFsbCB1bmlmb3JtcyB0byB0aGUgV2ViR0xDb250ZXh0LlxuICpcbiAqIEBjbGFzcyBQcm9ncmFtXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1dlYkdMX0NvbnRleHR9IGdsIENvbnRleHQgdG8gYmUgdXNlZCB0byBjcmVhdGUgdGhlIHNoYWRlciBwcm9ncmFtXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBQcm9ncmFtIG9wdGlvbnNcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5mdW5jdGlvbiBQcm9ncmFtKGdsLCBvcHRpb25zKSB7XG4gICAgdGhpcy5nbCA9IGdsO1xuICAgIHRoaXMudGV4dHVyZVNsb3RzID0gMTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgdGhpcy5yZWdpc3RlcmVkTWF0ZXJpYWxzID0ge307XG4gICAgdGhpcy5mbGFnZ2VkVW5pZm9ybXMgPSBbXTtcbiAgICB0aGlzLmNhY2hlZFVuaWZvcm1zICA9IHt9O1xuICAgIHRoaXMudW5pZm9ybVR5cGVzID0gW107XG5cbiAgICB0aGlzLmRlZmluaXRpb25WZWM0ID0gW107XG4gICAgdGhpcy5kZWZpbml0aW9uVmVjMyA9IFtdO1xuICAgIHRoaXMuZGVmaW5pdGlvbkZsb2F0ID0gW107XG4gICAgdGhpcy5hcHBsaWNhdGlvblZlYzMgPSBbXTtcbiAgICB0aGlzLmFwcGxpY2F0aW9uVmVjNCA9IFtdO1xuICAgIHRoaXMuYXBwbGljYXRpb25GbG9hdCA9IFtdO1xuICAgIHRoaXMuYXBwbGljYXRpb25WZXJ0ID0gW107XG4gICAgdGhpcy5kZWZpbml0aW9uVmVydCA9IFtdO1xuXG4gICAgdGhpcy5yZXNldFByb2dyYW0oKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgYSBtYXRlcmlhbCBoYXMgYWxyZWFkeSBiZWVuIHJlZ2lzdGVyZWQgdG9cbiAqIHRoZSBzaGFkZXIgcHJvZ3JhbS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgTmFtZSBvZiB0YXJnZXQgaW5wdXQgb2YgbWF0ZXJpYWwuXG4gKiBAcGFyYW0ge09iamVjdH0gbWF0ZXJpYWwgQ29tcGlsZWQgbWF0ZXJpYWwgb2JqZWN0IGJlaW5nIHZlcmlmaWVkLlxuICpcbiAqIEByZXR1cm4ge1Byb2dyYW19IHRoaXMgQ3VycmVudCBwcm9ncmFtLlxuICovXG5Qcm9ncmFtLnByb3RvdHlwZS5yZWdpc3Rlck1hdGVyaWFsID0gZnVuY3Rpb24gcmVnaXN0ZXJNYXRlcmlhbChuYW1lLCBtYXRlcmlhbCkge1xuICAgIHZhciBjb21waWxlZCA9IG1hdGVyaWFsO1xuICAgIHZhciB0eXBlID0gaW5wdXRUeXBlc1tuYW1lXTtcbiAgICB2YXIgbWFzayA9IG1hc2tzW3R5cGVdO1xuXG4gICAgaWYgKCh0aGlzLnJlZ2lzdGVyZWRNYXRlcmlhbHNbbWF0ZXJpYWwuX2lkXSAmIG1hc2spID09PSBtYXNrKSByZXR1cm4gdGhpcztcblxuICAgIHZhciBrO1xuXG4gICAgZm9yIChrIGluIGNvbXBpbGVkLnVuaWZvcm1zKSB7XG4gICAgICAgIGlmICh1bmlmb3Jtcy5rZXlzLmluZGV4T2YoaykgPT09IC0xKSB7XG4gICAgICAgICAgICB1bmlmb3Jtcy5rZXlzLnB1c2goayk7XG4gICAgICAgICAgICB1bmlmb3Jtcy52YWx1ZXMucHVzaChjb21waWxlZC51bmlmb3Jtc1trXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGsgaW4gY29tcGlsZWQudmFyeWluZ3MpIHtcbiAgICAgICAgaWYgKHZhcnlpbmdzLmtleXMuaW5kZXhPZihrKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIHZhcnlpbmdzLmtleXMucHVzaChrKTtcbiAgICAgICAgICAgIHZhcnlpbmdzLnZhbHVlcy5wdXNoKGNvbXBpbGVkLnZhcnlpbmdzW2tdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoayBpbiBjb21waWxlZC5hdHRyaWJ1dGVzKSB7XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzLmtleXMuaW5kZXhPZihrKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMua2V5cy5wdXNoKGspO1xuICAgICAgICAgICAgYXR0cmlidXRlcy52YWx1ZXMucHVzaChjb21waWxlZC5hdHRyaWJ1dGVzW2tdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucmVnaXN0ZXJlZE1hdGVyaWFsc1ttYXRlcmlhbC5faWRdIHw9IG1hc2s7XG5cbiAgICBpZiAodHlwZSA9PT0gJ2Zsb2F0Jykge1xuICAgICAgICB0aGlzLmRlZmluaXRpb25GbG9hdC5wdXNoKG1hdGVyaWFsLmRlZmluZXMpO1xuICAgICAgICB0aGlzLmRlZmluaXRpb25GbG9hdC5wdXNoKCdmbG9hdCBmYV8nICsgbWF0ZXJpYWwuX2lkICsgJygpIHtcXG4gJyAgKyBjb21waWxlZC5nbHNsICsgJyBcXG59Jyk7XG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25GbG9hdC5wdXNoKCdpZiAoaW50KGFicyhJRCkpID09ICcgKyBtYXRlcmlhbC5faWQgKyAnKSByZXR1cm4gZmFfJyArIG1hdGVyaWFsLl9pZCAgKyAnKCk7Jyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09ICd2ZWMzJykge1xuICAgICAgICB0aGlzLmRlZmluaXRpb25WZWMzLnB1c2gobWF0ZXJpYWwuZGVmaW5lcyk7XG4gICAgICAgIHRoaXMuZGVmaW5pdGlvblZlYzMucHVzaCgndmVjMyBmYV8nICsgbWF0ZXJpYWwuX2lkICsgJygpIHtcXG4gJyAgKyBjb21waWxlZC5nbHNsICsgJyBcXG59Jyk7XG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25WZWMzLnB1c2goJ2lmIChpbnQoYWJzKElELngpKSA9PSAnICsgbWF0ZXJpYWwuX2lkICsgJykgcmV0dXJuIGZhXycgKyBtYXRlcmlhbC5faWQgKyAnKCk7Jyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09ICd2ZWM0Jykge1xuICAgICAgICB0aGlzLmRlZmluaXRpb25WZWM0LnB1c2gobWF0ZXJpYWwuZGVmaW5lcyk7XG4gICAgICAgIHRoaXMuZGVmaW5pdGlvblZlYzQucHVzaCgndmVjNCBmYV8nICsgbWF0ZXJpYWwuX2lkICsgJygpIHtcXG4gJyAgKyBjb21waWxlZC5nbHNsICsgJyBcXG59Jyk7XG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25WZWM0LnB1c2goJ2lmIChpbnQoYWJzKElELngpKSA9PSAnICsgbWF0ZXJpYWwuX2lkICsgJykgcmV0dXJuIGZhXycgKyBtYXRlcmlhbC5faWQgKyAnKCk7Jyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09ICd2ZXJ0Jykge1xuICAgICAgICB0aGlzLmRlZmluaXRpb25WZXJ0LnB1c2gobWF0ZXJpYWwuZGVmaW5lcyk7XG4gICAgICAgIHRoaXMuZGVmaW5pdGlvblZlcnQucHVzaCgndmVjMyBmYV8nICsgbWF0ZXJpYWwuX2lkICsgJygpIHtcXG4gJyAgKyBjb21waWxlZC5nbHNsICsgJyBcXG59Jyk7XG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25WZXJ0LnB1c2goJ2lmIChpbnQoYWJzKElELngpKSA9PSAnICsgbWF0ZXJpYWwuX2lkICsgJykgcmV0dXJuIGZhXycgKyBtYXRlcmlhbC5faWQgKyAnKCk7Jyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmVzZXRQcm9ncmFtKCk7XG59O1xuXG4vKipcbiAqIENsZWFycyBhbGwgY2FjaGVkIHVuaWZvcm1zIGFuZCBhdHRyaWJ1dGUgbG9jYXRpb25zLiAgQXNzZW1ibGVzXG4gKiBuZXcgZnJhZ21lbnQgYW5kIHZlcnRleCBzaGFkZXJzIGFuZCBiYXNlZCBvbiBtYXRlcmlhbCBmcm9tXG4gKiBjdXJyZW50bHkgcmVnaXN0ZXJlZCBtYXRlcmlhbHMuICBBdHRhY2hlcyBzYWlkIHNoYWRlcnMgdG8gbmV3XG4gKiBzaGFkZXIgcHJvZ3JhbSBhbmQgdXBvbiBzdWNjZXNzIGxpbmtzIHByb2dyYW0gdG8gdGhlIFdlYkdMXG4gKiBjb250ZXh0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtQcm9ncmFtfSBDdXJyZW50IHByb2dyYW0uXG4gKi9cblByb2dyYW0ucHJvdG90eXBlLnJlc2V0UHJvZ3JhbSA9IGZ1bmN0aW9uIHJlc2V0UHJvZ3JhbSgpIHtcbiAgICB2YXIgdmVydGV4SGVhZGVyID0gW2hlYWRlcl07XG4gICAgdmFyIGZyYWdtZW50SGVhZGVyID0gW2hlYWRlcl07XG5cbiAgICB2YXIgZnJhZ21lbnRTb3VyY2U7XG4gICAgdmFyIHZlcnRleFNvdXJjZTtcbiAgICB2YXIgcHJvZ3JhbTtcbiAgICB2YXIgbmFtZTtcbiAgICB2YXIgdmFsdWU7XG4gICAgdmFyIGk7XG5cbiAgICB0aGlzLnVuaWZvcm1Mb2NhdGlvbnMgICA9IFtdO1xuICAgIHRoaXMuYXR0cmlidXRlTG9jYXRpb25zID0ge307XG5cbiAgICB0aGlzLnVuaWZvcm1UeXBlcyA9IHt9O1xuXG4gICAgdGhpcy5hdHRyaWJ1dGVOYW1lcyA9IGNsb25lKGF0dHJpYnV0ZXMua2V5cyk7XG4gICAgdGhpcy5hdHRyaWJ1dGVWYWx1ZXMgPSBjbG9uZShhdHRyaWJ1dGVzLnZhbHVlcyk7XG5cbiAgICB0aGlzLnZhcnlpbmdOYW1lcyA9IGNsb25lKHZhcnlpbmdzLmtleXMpO1xuICAgIHRoaXMudmFyeWluZ1ZhbHVlcyA9IGNsb25lKHZhcnlpbmdzLnZhbHVlcyk7XG5cbiAgICB0aGlzLnVuaWZvcm1OYW1lcyA9IGNsb25lKHVuaWZvcm1zLmtleXMpO1xuICAgIHRoaXMudW5pZm9ybVZhbHVlcyA9IGNsb25lKHVuaWZvcm1zLnZhbHVlcyk7XG5cbiAgICB0aGlzLmZsYWdnZWRVbmlmb3JtcyA9IFtdO1xuICAgIHRoaXMuY2FjaGVkVW5pZm9ybXMgPSB7fTtcblxuICAgIGZyYWdtZW50SGVhZGVyLnB1c2goJ3VuaWZvcm0gc2FtcGxlcjJEIHVfdGV4dHVyZXNbN107XFxuJyk7XG5cbiAgICBpZiAodGhpcy5hcHBsaWNhdGlvblZlcnQubGVuZ3RoKSB7XG4gICAgICAgIHZlcnRleEhlYWRlci5wdXNoKCd1bmlmb3JtIHNhbXBsZXIyRCB1X3RleHR1cmVzWzddO1xcbicpO1xuICAgIH1cblxuICAgIGZvcihpID0gMDsgaSA8IHRoaXMudW5pZm9ybU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5hbWUgPSB0aGlzLnVuaWZvcm1OYW1lc1tpXTtcbiAgICAgICAgdmFsdWUgPSB0aGlzLnVuaWZvcm1WYWx1ZXNbaV07XG4gICAgICAgIHZlcnRleEhlYWRlci5wdXNoKCd1bmlmb3JtICcgKyBUWVBFU1t2YWx1ZS5sZW5ndGhdICsgbmFtZSArICc7XFxuJyk7XG4gICAgICAgIGZyYWdtZW50SGVhZGVyLnB1c2goJ3VuaWZvcm0gJyArIFRZUEVTW3ZhbHVlLmxlbmd0aF0gKyBuYW1lICsgJztcXG4nKTtcbiAgICB9XG5cbiAgICBmb3IoaSA9IDA7IGkgPCB0aGlzLmF0dHJpYnV0ZU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5hbWUgPSB0aGlzLmF0dHJpYnV0ZU5hbWVzW2ldO1xuICAgICAgICB2YWx1ZSA9IHRoaXMuYXR0cmlidXRlVmFsdWVzW2ldO1xuICAgICAgICB2ZXJ0ZXhIZWFkZXIucHVzaCgnYXR0cmlidXRlICcgKyBUWVBFU1t2YWx1ZS5sZW5ndGhdICsgbmFtZSArICc7XFxuJyk7XG4gICAgfVxuXG4gICAgZm9yKGkgPSAwOyBpIDwgdGhpcy52YXJ5aW5nTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbmFtZSA9IHRoaXMudmFyeWluZ05hbWVzW2ldO1xuICAgICAgICB2YWx1ZSA9IHRoaXMudmFyeWluZ1ZhbHVlc1tpXTtcbiAgICAgICAgdmVydGV4SGVhZGVyLnB1c2goJ3ZhcnlpbmcgJyArIFRZUEVTW3ZhbHVlLmxlbmd0aF0gICsgbmFtZSArICc7XFxuJyk7XG4gICAgICAgIGZyYWdtZW50SGVhZGVyLnB1c2goJ3ZhcnlpbmcgJyArIFRZUEVTW3ZhbHVlLmxlbmd0aF0gKyBuYW1lICsgJztcXG4nKTtcbiAgICB9XG5cbiAgICB2ZXJ0ZXhTb3VyY2UgPSB2ZXJ0ZXhIZWFkZXIuam9pbignJykgKyB2ZXJ0ZXhXcmFwcGVyXG4gICAgICAgIC5yZXBsYWNlKCcjdmVydF9kZWZpbml0aW9ucycsIHRoaXMuZGVmaW5pdGlvblZlcnQuam9pbignXFxuJykpXG4gICAgICAgIC5yZXBsYWNlKCcjdmVydF9hcHBsaWNhdGlvbnMnLCB0aGlzLmFwcGxpY2F0aW9uVmVydC5qb2luKCdcXG4nKSk7XG5cbiAgICBmcmFnbWVudFNvdXJjZSA9IGZyYWdtZW50SGVhZGVyLmpvaW4oJycpICsgZnJhZ21lbnRXcmFwcGVyXG4gICAgICAgIC5yZXBsYWNlKCcjdmVjM19kZWZpbml0aW9ucycsIHRoaXMuZGVmaW5pdGlvblZlYzMuam9pbignXFxuJykpXG4gICAgICAgIC5yZXBsYWNlKCcjdmVjM19hcHBsaWNhdGlvbnMnLCB0aGlzLmFwcGxpY2F0aW9uVmVjMy5qb2luKCdcXG4nKSlcbiAgICAgICAgLnJlcGxhY2UoJyN2ZWM0X2RlZmluaXRpb25zJywgdGhpcy5kZWZpbml0aW9uVmVjNC5qb2luKCdcXG4nKSlcbiAgICAgICAgLnJlcGxhY2UoJyN2ZWM0X2FwcGxpY2F0aW9ucycsIHRoaXMuYXBwbGljYXRpb25WZWM0LmpvaW4oJ1xcbicpKVxuICAgICAgICAucmVwbGFjZSgnI2Zsb2F0X2RlZmluaXRpb25zJywgdGhpcy5kZWZpbml0aW9uRmxvYXQuam9pbignXFxuJykpXG4gICAgICAgIC5yZXBsYWNlKCcjZmxvYXRfYXBwbGljYXRpb25zJywgdGhpcy5hcHBsaWNhdGlvbkZsb2F0LmpvaW4oJ1xcbicpKTtcblxuICAgIHByb2dyYW0gPSB0aGlzLmdsLmNyZWF0ZVByb2dyYW0oKTtcblxuICAgIHRoaXMuZ2wuYXR0YWNoU2hhZGVyKFxuICAgICAgICBwcm9ncmFtLFxuICAgICAgICB0aGlzLmNvbXBpbGVTaGFkZXIodGhpcy5nbC5jcmVhdGVTaGFkZXIoVkVSVEVYX1NIQURFUiksIHZlcnRleFNvdXJjZSlcbiAgICApO1xuXG4gICAgdGhpcy5nbC5hdHRhY2hTaGFkZXIoXG4gICAgICAgIHByb2dyYW0sXG4gICAgICAgIHRoaXMuY29tcGlsZVNoYWRlcih0aGlzLmdsLmNyZWF0ZVNoYWRlcihGUkFHTUVOVF9TSEFERVIpLCBmcmFnbWVudFNvdXJjZSlcbiAgICApO1xuXG4gICAgdGhpcy5nbC5saW5rUHJvZ3JhbShwcm9ncmFtKTtcblxuICAgIGlmICghIHRoaXMuZ2wuZ2V0UHJvZ3JhbVBhcmFtZXRlcihwcm9ncmFtLCB0aGlzLmdsLkxJTktfU1RBVFVTKSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdsaW5rIGVycm9yOiAnICsgdGhpcy5nbC5nZXRQcm9ncmFtSW5mb0xvZyhwcm9ncmFtKSk7XG4gICAgICAgIHRoaXMucHJvZ3JhbSA9IG51bGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnByb2dyYW0gPSBwcm9ncmFtO1xuICAgICAgICB0aGlzLmdsLnVzZVByb2dyYW0odGhpcy5wcm9ncmFtKTtcbiAgICB9XG5cbiAgICB0aGlzLnNldFVuaWZvcm1zKHRoaXMudW5pZm9ybU5hbWVzLCB0aGlzLnVuaWZvcm1WYWx1ZXMpO1xuXG4gICAgdmFyIHRleHR1cmVMb2NhdGlvbiA9IHRoaXMuZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgJ3VfdGV4dHVyZXNbMF0nKTtcbiAgICB0aGlzLmdsLnVuaWZvcm0xaXYodGV4dHVyZUxvY2F0aW9uLCBbMCwgMSwgMiwgMywgNCwgNSwgNl0pO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENvbXBhcmVzIHRoZSB2YWx1ZSBvZiB0aGUgaW5wdXQgdW5pZm9ybSB2YWx1ZSBhZ2FpbnN0XG4gKiB0aGUgY2FjaGVkIHZhbHVlIHN0b3JlZCBvbiB0aGUgUHJvZ3JhbSBjbGFzcy4gIFVwZGF0ZXMgYW5kXG4gKiBjcmVhdGVzIG5ldyBlbnRyaWVzIGluIHRoZSBjYWNoZSB3aGVuIG5lY2Vzc2FyeS5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gdGFyZ2V0TmFtZSBLZXkgb2YgdW5pZm9ybSBzcGVjIGJlaW5nIGV2YWx1YXRlZC5cbiAqIEBwYXJhbSB7TnVtYmVyfEFycmF5fSB2YWx1ZSBWYWx1ZSBvZiB1bmlmb3JtIHNwZWMgYmVpbmcgZXZhbHVhdGVkLlxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59IGJvb2xlYW4gSW5kaWNhdGluZyB3aGV0aGVyIHRoZSB1bmlmb3JtIGJlaW5nIHNldCBpcyBjYWNoZWQuXG4gKi9cblByb2dyYW0ucHJvdG90eXBlLnVuaWZvcm1Jc0NhY2hlZCA9IGZ1bmN0aW9uKHRhcmdldE5hbWUsIHZhbHVlKSB7XG4gICAgaWYodGhpcy5jYWNoZWRVbmlmb3Jtc1t0YXJnZXROYW1lXSA9PSBudWxsKSB7XG4gICAgICAgIGlmICh2YWx1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuY2FjaGVkVW5pZm9ybXNbdGFyZ2V0TmFtZV0gPSBuZXcgRmxvYXQzMkFycmF5KHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY2FjaGVkVW5pZm9ybXNbdGFyZ2V0TmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGVsc2UgaWYgKHZhbHVlLmxlbmd0aCkge1xuICAgICAgICB2YXIgaSA9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgaWYodmFsdWVbaV0gIT09IHRoaXMuY2FjaGVkVW5pZm9ybXNbdGFyZ2V0TmFtZV1baV0pIHtcbiAgICAgICAgICAgICAgICBpID0gdmFsdWUubGVuZ3RoO1xuICAgICAgICAgICAgICAgIHdoaWxlKGktLSkgdGhpcy5jYWNoZWRVbmlmb3Jtc1t0YXJnZXROYW1lXVtpXSA9IHZhbHVlW2ldO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGVsc2UgaWYgKHRoaXMuY2FjaGVkVW5pZm9ybXNbdGFyZ2V0TmFtZV0gIT09IHZhbHVlKSB7XG4gICAgICAgIHRoaXMuY2FjaGVkVW5pZm9ybXNbdGFyZ2V0TmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIGFsbCBwYXNzaW5nIG9mIHVuaWZvcm1zIHRvIFdlYkdMIGRyYXdpbmcgY29udGV4dC4gIFRoaXNcbiAqIGZ1bmN0aW9uIHdpbGwgZmluZCB0aGUgdW5pZm9ybSBsb2NhdGlvbiBhbmQgdGhlbiwgYmFzZWQgb25cbiAqIGEgdHlwZSBpbmZlcnJlZCBmcm9tIHRoZSBqYXZhc2NyaXB0IHZhbHVlIG9mIHRoZSB1bmlmb3JtLCBpdCB3aWxsIGNhbGxcbiAqIHRoZSBhcHByb3ByaWF0ZSBmdW5jdGlvbiB0byBwYXNzIHRoZSB1bmlmb3JtIHRvIFdlYkdMLiAgRmluYWxseSxcbiAqIHNldFVuaWZvcm1zIHdpbGwgaXRlcmF0ZSB0aHJvdWdoIHRoZSBwYXNzZWQgaW4gc2hhZGVyQ2h1bmtzIChpZiBhbnkpXG4gKiBhbmQgc2V0IHRoZSBhcHByb3ByaWF0ZSB1bmlmb3JtcyB0byBzcGVjaWZ5IHdoaWNoIGNodW5rcyB0byB1c2UuXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtBcnJheX0gdW5pZm9ybU5hbWVzIEFycmF5IGNvbnRhaW5pbmcgdGhlIGtleXMgb2YgYWxsIHVuaWZvcm1zIHRvIGJlIHNldC5cbiAqIEBwYXJhbSB7QXJyYXl9IHVuaWZvcm1WYWx1ZSBBcnJheSBjb250YWluaW5nIHRoZSB2YWx1ZXMgb2YgYWxsIHVuaWZvcm1zIHRvIGJlIHNldC5cbiAqXG4gKiBAcmV0dXJuIHtQcm9ncmFtfSBDdXJyZW50IHByb2dyYW0uXG4gKi9cblByb2dyYW0ucHJvdG90eXBlLnNldFVuaWZvcm1zID0gZnVuY3Rpb24gKHVuaWZvcm1OYW1lcywgdW5pZm9ybVZhbHVlKSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICB2YXIgbG9jYXRpb247XG4gICAgdmFyIHZhbHVlO1xuICAgIHZhciBuYW1lO1xuICAgIHZhciBsZW47XG4gICAgdmFyIGk7XG5cbiAgICBpZiAoIXRoaXMucHJvZ3JhbSkgcmV0dXJuIHRoaXM7XG5cbiAgICBsZW4gPSB1bmlmb3JtTmFtZXMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBuYW1lID0gdW5pZm9ybU5hbWVzW2ldO1xuICAgICAgICB2YWx1ZSA9IHVuaWZvcm1WYWx1ZVtpXTtcblxuICAgICAgICAvLyBSZXRyZWl2ZSB0aGUgY2FjaGVkIGxvY2F0aW9uIG9mIHRoZSB1bmlmb3JtLFxuICAgICAgICAvLyByZXF1ZXN0aW5nIGEgbmV3IGxvY2F0aW9uIGZyb20gdGhlIFdlYkdMIGNvbnRleHRcbiAgICAgICAgLy8gaWYgaXQgZG9lcyBub3QgeWV0IGV4aXN0LlxuXG4gICAgICAgIGxvY2F0aW9uID0gdGhpcy51bmlmb3JtTG9jYXRpb25zW25hbWVdIHx8IGdsLmdldFVuaWZvcm1Mb2NhdGlvbih0aGlzLnByb2dyYW0sIG5hbWUpO1xuICAgICAgICBpZiAoIWxvY2F0aW9uKSBjb250aW51ZTtcblxuICAgICAgICB0aGlzLnVuaWZvcm1Mb2NhdGlvbnNbbmFtZV0gPSBsb2NhdGlvbjtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgdmFsdWUgaXMgYWxyZWFkeSBzZXQgZm9yIHRoZVxuICAgICAgICAvLyBnaXZlbiB1bmlmb3JtLlxuXG4gICAgICAgIGlmICh0aGlzLnVuaWZvcm1Jc0NhY2hlZChuYW1lLCB2YWx1ZSkpIGNvbnRpbnVlO1xuXG4gICAgICAgIC8vIERldGVybWluZSB0aGUgY29ycmVjdCBmdW5jdGlvbiBhbmQgcGFzcyB0aGUgdW5pZm9ybVxuICAgICAgICAvLyB2YWx1ZSB0byBXZWJHTC5cblxuICAgICAgICBpZiAoIXRoaXMudW5pZm9ybVR5cGVzW25hbWVdKSB7XG4gICAgICAgICAgICB0aGlzLnVuaWZvcm1UeXBlc1tuYW1lXSA9IHRoaXMuZ2V0VW5pZm9ybVR5cGVGcm9tVmFsdWUodmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FsbCB1bmlmb3JtIHNldHRlciBmdW5jdGlvbiBvbiBXZWJHTCBjb250ZXh0IHdpdGggY29ycmVjdCB2YWx1ZVxuXG4gICAgICAgIHN3aXRjaCAodGhpcy51bmlmb3JtVHlwZXNbbmFtZV0pIHtcbiAgICAgICAgICAgIGNhc2UgJ3VuaWZvcm00ZnYnOiAgZ2wudW5pZm9ybTRmdihsb2NhdGlvbiwgdmFsdWUpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VuaWZvcm0zZnYnOiAgZ2wudW5pZm9ybTNmdihsb2NhdGlvbiwgdmFsdWUpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VuaWZvcm0yZnYnOiAgZ2wudW5pZm9ybTJmdihsb2NhdGlvbiwgdmFsdWUpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VuaWZvcm0xZnYnOiAgZ2wudW5pZm9ybTFmdihsb2NhdGlvbiwgdmFsdWUpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VuaWZvcm0xZicgOiAgZ2wudW5pZm9ybTFmKGxvY2F0aW9uLCB2YWx1ZSk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndW5pZm9ybU1hdHJpeDNmdic6IGdsLnVuaWZvcm1NYXRyaXgzZnYobG9jYXRpb24sIGZhbHNlLCB2YWx1ZSk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndW5pZm9ybU1hdHJpeDRmdic6IGdsLnVuaWZvcm1NYXRyaXg0ZnYobG9jYXRpb24sIGZhbHNlLCB2YWx1ZSk7IGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEluZmVycyB1bmlmb3JtIHNldHRlciBmdW5jdGlvbiB0byBiZSBjYWxsZWQgb24gdGhlIFdlYkdMIGNvbnRleHQsIGJhc2VkXG4gKiBvbiBhbiBpbnB1dCB2YWx1ZS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ8QXJyYXl9IHZhbHVlIFZhbHVlIGZyb20gd2hpY2ggdW5pZm9ybSB0eXBlIGlzIGluZmVycmVkLlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB1bmlmb3JtIGZ1bmN0aW9uIGZvciBnaXZlbiB2YWx1ZS5cbiAqL1xuUHJvZ3JhbS5wcm90b3R5cGUuZ2V0VW5pZm9ybVR5cGVGcm9tVmFsdWUgPSBmdW5jdGlvbiBnZXRVbmlmb3JtVHlwZUZyb21WYWx1ZSh2YWx1ZSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSB8fCB2YWx1ZSBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSkge1xuICAgICAgICBzd2l0Y2ggKHZhbHVlLmxlbmd0aCkge1xuICAgICAgICAgICAgY2FzZSAxOiAgcmV0dXJuICd1bmlmb3JtMWZ2JztcbiAgICAgICAgICAgIGNhc2UgMjogIHJldHVybiAndW5pZm9ybTJmdic7XG4gICAgICAgICAgICBjYXNlIDM6ICByZXR1cm4gJ3VuaWZvcm0zZnYnO1xuICAgICAgICAgICAgY2FzZSA0OiAgcmV0dXJuICd1bmlmb3JtNGZ2JztcbiAgICAgICAgICAgIGNhc2UgOTogIHJldHVybiAndW5pZm9ybU1hdHJpeDNmdic7XG4gICAgICAgICAgICBjYXNlIDE2OiByZXR1cm4gJ3VuaWZvcm1NYXRyaXg0ZnYnO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKCFpc05hTihwYXJzZUZsb2F0KHZhbHVlKSkgJiYgaXNGaW5pdGUodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiAndW5pZm9ybTFmJztcbiAgICB9XG5cbiAgICB0aHJvdyAnY2FudCBsb2FkIHVuaWZvcm0gXCInICsgbmFtZSArICdcIiB3aXRoIHZhbHVlOicgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG59O1xuXG4vKipcbiAqIEFkZHMgc2hhZGVyIHNvdXJjZSB0byBzaGFkZXIgYW5kIGNvbXBpbGVzIHRoZSBpbnB1dCBzaGFkZXIuICBDaGVja3NcbiAqIGNvbXBpbGUgc3RhdHVzIGFuZCBsb2dzIGVycm9yIGlmIG5lY2Vzc2FyeS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHNoYWRlciBQcm9ncmFtIHRvIGJlIGNvbXBpbGVkLlxuICogQHBhcmFtIHtTdHJpbmd9IHNvdXJjZSBTb3VyY2UgdG8gYmUgdXNlZCBpbiB0aGUgc2hhZGVyLlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gQ29tcGlsZWQgc2hhZGVyLlxuICovXG5Qcm9ncmFtLnByb3RvdHlwZS5jb21waWxlU2hhZGVyID0gZnVuY3Rpb24gY29tcGlsZVNoYWRlcihzaGFkZXIsIHNvdXJjZSkge1xuICAgIHZhciBpID0gMTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZGVidWcpIHtcbiAgICAgICAgdGhpcy5nbC5jb21waWxlU2hhZGVyID0gRGVidWcuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICB0aGlzLmdsLnNoYWRlclNvdXJjZShzaGFkZXIsIHNvdXJjZSk7XG4gICAgdGhpcy5nbC5jb21waWxlU2hhZGVyKHNoYWRlcik7XG4gICAgaWYgKCF0aGlzLmdsLmdldFNoYWRlclBhcmFtZXRlcihzaGFkZXIsIHRoaXMuZ2wuQ09NUElMRV9TVEFUVVMpKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ2NvbXBpbGUgZXJyb3I6ICcgKyB0aGlzLmdsLmdldFNoYWRlckluZm9Mb2coc2hhZGVyKSk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJzE6ICcgKyBzb3VyY2UucmVwbGFjZSgvXFxuL2csIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAnXFxuJyArIChpKz0xKSArICc6ICc7XG4gICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2hhZGVyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcm9ncmFtO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRleHR1cmUgaXMgYSBwcml2YXRlIGNsYXNzIHRoYXQgc3RvcmVzIGltYWdlIGRhdGFcbiAqIHRvIGJlIGFjY2Vzc2VkIGZyb20gYSBzaGFkZXIgb3IgdXNlZCBhcyBhIHJlbmRlciB0YXJnZXQuXG4gKlxuICogQGNsYXNzIFRleHR1cmVcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7R0x9IGdsIEdMXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBPcHRpb25zXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gVGV4dHVyZShnbCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMuaWQgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG4gICAgdGhpcy53aWR0aCA9IG9wdGlvbnMud2lkdGggfHwgMDtcbiAgICB0aGlzLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDA7XG4gICAgdGhpcy5taXBtYXAgPSBvcHRpb25zLm1pcG1hcDtcbiAgICB0aGlzLmZvcm1hdCA9IG9wdGlvbnMuZm9ybWF0IHx8ICdSR0JBJztcbiAgICB0aGlzLnR5cGUgPSBvcHRpb25zLnR5cGUgfHwgJ1VOU0lHTkVEX0JZVEUnO1xuICAgIHRoaXMuZ2wgPSBnbDtcblxuICAgIHRoaXMuYmluZCgpO1xuXG4gICAgZ2wucGl4ZWxTdG9yZWkoZ2wuVU5QQUNLX0ZMSVBfWV9XRUJHTCwgZmFsc2UpO1xuICAgIGdsLnBpeGVsU3RvcmVpKGdsLlVOUEFDS19QUkVNVUxUSVBMWV9BTFBIQV9XRUJHTCwgZmFsc2UpO1xuXG4gICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsW29wdGlvbnMubWFnRmlsdGVyXSB8fCBnbC5ORUFSRVNUKTtcbiAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2xbb3B0aW9ucy5taW5GaWx0ZXJdIHx8IGdsLk5FQVJFU1QpO1xuXG4gICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2xbb3B0aW9ucy53cmFwU10gfHwgZ2wuQ0xBTVBfVE9fRURHRSk7XG4gICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCwgZ2xbb3B0aW9ucy53cmFwVF0gfHwgZ2wuQ0xBTVBfVE9fRURHRSk7XG59XG5cbi8qKlxuICogQmluZHMgdGhpcyB0ZXh0dXJlIGFzIHRoZSBzZWxlY3RlZCB0YXJnZXQuXG4gKlxuICogQG1ldGhvZFxuICogQHJldHVybiB7T2JqZWN0fSBDdXJyZW50IHRleHR1cmUgaW5zdGFuY2UuXG4gKi9cblRleHR1cmUucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbiBiaW5kKCkge1xuICAgIHRoaXMuZ2wuYmluZFRleHR1cmUodGhpcy5nbC5URVhUVVJFXzJELCB0aGlzLmlkKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRXJhc2VzIHRoZSB0ZXh0dXJlIGRhdGEgaW4gdGhlIGdpdmVuIHRleHR1cmUgc2xvdC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcmV0dXJuIHtPYmplY3R9IEN1cnJlbnQgdGV4dHVyZSBpbnN0YW5jZS5cbiAqL1xuVGV4dHVyZS5wcm90b3R5cGUudW5iaW5kID0gZnVuY3Rpb24gdW5iaW5kKCkge1xuICAgIHRoaXMuZ2wuYmluZFRleHR1cmUodGhpcy5nbC5URVhUVVJFXzJELCBudWxsKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVwbGFjZXMgdGhlIGltYWdlIGRhdGEgaW4gdGhlIHRleHR1cmUgd2l0aCB0aGUgZ2l2ZW4gaW1hZ2UuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7SW1hZ2V9ICAgaW1nICAgICBUaGUgaW1hZ2Ugb2JqZWN0IHRvIHVwbG9hZCBwaXhlbCBkYXRhIGZyb20uXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICAgQ3VycmVudCB0ZXh0dXJlIGluc3RhbmNlLlxuICovXG5UZXh0dXJlLnByb3RvdHlwZS5zZXRJbWFnZSA9IGZ1bmN0aW9uIHNldEltYWdlKGltZykge1xuICAgIHRoaXMuZ2wudGV4SW1hZ2UyRCh0aGlzLmdsLlRFWFRVUkVfMkQsIDAsIHRoaXMuZ2xbdGhpcy5mb3JtYXRdLCB0aGlzLmdsW3RoaXMuZm9ybWF0XSwgdGhpcy5nbFt0aGlzLnR5cGVdLCBpbWcpO1xuICAgIGlmICh0aGlzLm1pcG1hcCkgdGhpcy5nbC5nZW5lcmF0ZU1pcG1hcCh0aGlzLmdsLlRFWFRVUkVfMkQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXBsYWNlcyB0aGUgaW1hZ2UgZGF0YSBpbiB0aGUgdGV4dHVyZSB3aXRoIGFuIGFycmF5IG9mIGFyYml0cmFyeSBkYXRhLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSAgIGlucHV0ICAgQXJyYXkgdG8gYmUgc2V0IGFzIGRhdGEgdG8gdGV4dHVyZS5cbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgICBDdXJyZW50IHRleHR1cmUgaW5zdGFuY2UuXG4gKi9cblRleHR1cmUucHJvdG90eXBlLnNldEFycmF5ID0gZnVuY3Rpb24gc2V0QXJyYXkoaW5wdXQpIHtcbiAgICB0aGlzLmdsLnRleEltYWdlMkQodGhpcy5nbC5URVhUVVJFXzJELCAwLCB0aGlzLmdsW3RoaXMuZm9ybWF0XSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQsIDAsIHRoaXMuZ2xbdGhpcy5mb3JtYXRdLCB0aGlzLmdsW3RoaXMudHlwZV0sIGlucHV0KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRHVtcHMgdGhlIHJnYi1waXhlbCBjb250ZW50cyBvZiBhIHRleHR1cmUgaW50byBhbiBhcnJheSBmb3IgZGVidWdnaW5nIHB1cnBvc2VzXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4ICAgICAgICB4LW9mZnNldCBiZXR3ZWVuIHRleHR1cmUgY29vcmRpbmF0ZXMgYW5kIHNuYXBzaG90XG4gKiBAcGFyYW0ge051bWJlcn0geSAgICAgICAgeS1vZmZzZXQgYmV0d2VlbiB0ZXh0dXJlIGNvb3JkaW5hdGVzIGFuZCBzbmFwc2hvdFxuICogQHBhcmFtIHtOdW1iZXJ9IHdpZHRoICAgIHgtZGVwdGggb2YgdGhlIHNuYXBzaG90XG4gKiBAcGFyYW0ge051bWJlcn0gaGVpZ2h0ICAgeS1kZXB0aCBvZiB0aGUgc25hcHNob3RcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gICAgICAgICAgQW4gYXJyYXkgb2YgdGhlIHBpeGVscyBjb250YWluZWQgaW4gdGhlIHNuYXBzaG90LlxuICovXG5UZXh0dXJlLnByb3RvdHlwZS5yZWFkQmFjayA9IGZ1bmN0aW9uIHJlYWRCYWNrKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIHZhciBwaXhlbHM7XG4gICAgeCA9IHggfHwgMDtcbiAgICB5ID0geSB8fCAwO1xuICAgIHdpZHRoID0gd2lkdGggfHwgdGhpcy53aWR0aDtcbiAgICBoZWlnaHQgPSBoZWlnaHQgfHwgdGhpcy5oZWlnaHQ7XG4gICAgdmFyIGZiID0gZ2wuY3JlYXRlRnJhbWVidWZmZXIoKTtcbiAgICBnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIGZiKTtcbiAgICBnbC5mcmFtZWJ1ZmZlclRleHR1cmUyRChnbC5GUkFNRUJVRkZFUiwgZ2wuQ09MT1JfQVRUQUNITUVOVDAsIGdsLlRFWFRVUkVfMkQsIHRoaXMuaWQsIDApO1xuICAgIGlmIChnbC5jaGVja0ZyYW1lYnVmZmVyU3RhdHVzKGdsLkZSQU1FQlVGRkVSKSA9PT0gZ2wuRlJBTUVCVUZGRVJfQ09NUExFVEUpIHtcbiAgICAgICAgcGl4ZWxzID0gbmV3IFVpbnQ4QXJyYXkod2lkdGggKiBoZWlnaHQgKiA0KTtcbiAgICAgICAgZ2wucmVhZFBpeGVscyh4LCB5LCB3aWR0aCwgaGVpZ2h0LCBnbC5SR0JBLCBnbC5VTlNJR05FRF9CWVRFLCBwaXhlbHMpO1xuICAgIH1cbiAgICByZXR1cm4gcGl4ZWxzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUZXh0dXJlO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIFRleHR1cmUgPSByZXF1aXJlKCcuL1RleHR1cmUnKTtcbnZhciBjcmVhdGVDaGVja2VyYm9hcmQgPSByZXF1aXJlKCcuL2NyZWF0ZUNoZWNrZXJib2FyZCcpO1xuXG4vKipcbiAqIEhhbmRsZXMgbG9hZGluZywgYmluZGluZywgYW5kIHJlc2FtcGxpbmcgb2YgdGV4dHVyZXMgZm9yIFdlYkdMUmVuZGVyZXIuXG4gKlxuICogQGNsYXNzIFRleHR1cmVNYW5hZ2VyXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1dlYkdMX0NvbnRleHR9IGdsIENvbnRleHQgdXNlZCB0byBjcmVhdGUgYW5kIGJpbmQgdGV4dHVyZXMuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gVGV4dHVyZU1hbmFnZXIoZ2wpIHtcbiAgICB0aGlzLnJlZ2lzdHJ5ID0gW107XG4gICAgdGhpcy5fbmVlZHNSZXNhbXBsZSA9IFtdO1xuXG4gICAgdGhpcy5fYWN0aXZlVGV4dHVyZSA9IDA7XG4gICAgdGhpcy5fYm91bmRUZXh0dXJlID0gbnVsbDtcblxuICAgIHRoaXMuX2NoZWNrZXJib2FyZCA9IGNyZWF0ZUNoZWNrZXJib2FyZCgpO1xuXG4gICAgdGhpcy5nbCA9IGdsO1xufVxuXG4vKipcbiAqIFVwZGF0ZSBmdW5jdGlvbiB1c2VkIGJ5IFdlYkdMUmVuZGVyZXIgdG8gcXVldWUgcmVzYW1wbGVzIG9uXG4gKiByZWdpc3RlcmVkIHRleHR1cmVzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gICAgICB0aW1lICAgIFRpbWUgaW4gbWlsbGlzZWNvbmRzIGFjY29yZGluZyB0byB0aGUgY29tcG9zaXRvci5cbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gICAgICAgICAgdW5kZWZpbmVkXG4gKi9cblRleHR1cmVNYW5hZ2VyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUodGltZSkge1xuICAgIHZhciByZWdpc3RyeUxlbmd0aCA9IHRoaXMucmVnaXN0cnkubGVuZ3RoO1xuXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCByZWdpc3RyeUxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciB0ZXh0dXJlID0gdGhpcy5yZWdpc3RyeVtpXTtcblxuICAgICAgICBpZiAodGV4dHVyZSAmJiB0ZXh0dXJlLmlzTG9hZGVkICYmIHRleHR1cmUucmVzYW1wbGVSYXRlKSB7XG4gICAgICAgICAgICBpZiAoIXRleHR1cmUubGFzdFJlc2FtcGxlIHx8IHRpbWUgLSB0ZXh0dXJlLmxhc3RSZXNhbXBsZSA+IHRleHR1cmUucmVzYW1wbGVSYXRlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9uZWVkc1Jlc2FtcGxlW3RleHR1cmUuaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX25lZWRzUmVzYW1wbGVbdGV4dHVyZS5pZF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0ZXh0dXJlLmxhc3RSZXNhbXBsZSA9IHRpbWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgc3BlYyBhbmQgY3JlYXRlcyBhIHRleHR1cmUgYmFzZWQgb24gZ2l2ZW4gdGV4dHVyZSBkYXRhLlxuICogSGFuZGxlcyBsb2FkaW5nIGFzc2V0cyBpZiBuZWNlc3NhcnkuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSAgaW5wdXQgICBPYmplY3QgY29udGFpbmluZyB0ZXh0dXJlIGlkLCB0ZXh0dXJlIGRhdGFcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBhbmQgb3B0aW9ucyB1c2VkIHRvIGRyYXcgdGV4dHVyZS5cbiAqIEBwYXJhbSB7TnVtYmVyfSAgc2xvdCAgICBUZXh0dXJlIHNsb3QgdG8gYmluZCBnZW5lcmF0ZWQgdGV4dHVyZSB0by5cbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gICAgICB1bmRlZmluZWRcbiAqL1xuVGV4dHVyZU1hbmFnZXIucHJvdG90eXBlLnJlZ2lzdGVyID0gZnVuY3Rpb24gcmVnaXN0ZXIoaW5wdXQsIHNsb3QpIHtcbiAgICB2YXIgc291cmNlID0gaW5wdXQuZGF0YTtcbiAgICB2YXIgdGV4dHVyZUlkID0gaW5wdXQuaWQ7XG4gICAgdmFyIG9wdGlvbnMgPSBpbnB1dC5vcHRpb25zIHx8IHt9O1xuICAgIHZhciB0ZXh0dXJlID0gdGhpcy5yZWdpc3RyeVt0ZXh0dXJlSWRdO1xuICAgIHZhciBzcGVjO1xuXG4gICAgaWYgKCF0ZXh0dXJlKSB7XG5cbiAgICAgICAgdGV4dHVyZSA9IG5ldyBUZXh0dXJlKHRoaXMuZ2wsIG9wdGlvbnMpO1xuICAgICAgICB0ZXh0dXJlLnNldEltYWdlKHRoaXMuX2NoZWNrZXJib2FyZCk7XG5cbiAgICAgICAgLy8gQWRkIHRleHR1cmUgdG8gcmVnaXN0cnlcblxuICAgICAgICBzcGVjID0gdGhpcy5yZWdpc3RyeVt0ZXh0dXJlSWRdID0ge1xuICAgICAgICAgICAgcmVzYW1wbGVSYXRlOiBvcHRpb25zLnJlc2FtcGxlUmF0ZSB8fCBudWxsLFxuICAgICAgICAgICAgbGFzdFJlc2FtcGxlOiBudWxsLFxuICAgICAgICAgICAgaXNMb2FkZWQ6IGZhbHNlLFxuICAgICAgICAgICAgdGV4dHVyZTogdGV4dHVyZSxcbiAgICAgICAgICAgIHNvdXJjZTogc291cmNlLFxuICAgICAgICAgICAgaWQ6IHRleHR1cmVJZCxcbiAgICAgICAgICAgIHNsb3Q6IHNsb3RcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBIYW5kbGUgYXJyYXlcblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzb3VyY2UpIHx8IHNvdXJjZSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkgfHwgc291cmNlIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSB7XG4gICAgICAgICAgICB0aGlzLmJpbmRUZXh0dXJlKHRleHR1cmVJZCk7XG4gICAgICAgICAgICB0ZXh0dXJlLnNldEFycmF5KHNvdXJjZSk7XG4gICAgICAgICAgICBzcGVjLmlzTG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSB2aWRlb1xuXG4gICAgICAgIGVsc2UgaWYgKHdpbmRvdyAmJiBzb3VyY2UgaW5zdGFuY2VvZiB3aW5kb3cuSFRNTFZpZGVvRWxlbWVudCkge1xuICAgICAgICAgICAgc291cmNlLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZGRhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJpbmRUZXh0dXJlKHRleHR1cmVJZCk7XG4gICAgICAgICAgICAgICAgdGV4dHVyZS5zZXRJbWFnZShzb3VyY2UpO1xuXG4gICAgICAgICAgICAgICAgc3BlYy5pc0xvYWRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgc3BlYy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIGltYWdlIHVybFxuXG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBzb3VyY2UgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBsb2FkSW1hZ2Uoc291cmNlLCBmdW5jdGlvbiAoaW1nKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5iaW5kVGV4dHVyZSh0ZXh0dXJlSWQpO1xuICAgICAgICAgICAgICAgIHRleHR1cmUuc2V0SW1hZ2UoaW1nKTtcblxuICAgICAgICAgICAgICAgIHNwZWMuaXNMb2FkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHNwZWMuc291cmNlID0gaW1nO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0ZXh0dXJlSWQ7XG59O1xuXG4vKipcbiAqIExvYWRzIGFuIGltYWdlIGZyb20gYSBzdHJpbmcgb3IgSW1hZ2Ugb2JqZWN0IGFuZCBleGVjdXRlcyBhIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBpbnB1dCBUaGUgaW5wdXQgaW1hZ2UgZGF0YSB0byBsb2FkIGFzIGFuIGFzc2V0LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGZpcmVkIHdoZW4gdGhlIGltYWdlIGhhcyBmaW5pc2hlZCBsb2FkaW5nLlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gSW1hZ2Ugb2JqZWN0IGJlaW5nIGxvYWRlZC5cbiAqL1xuZnVuY3Rpb24gbG9hZEltYWdlIChpbnB1dCwgY2FsbGJhY2spIHtcbiAgICB2YXIgaW1hZ2UgPSAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJyA/IG5ldyBJbWFnZSgpIDogaW5wdXQpIHx8IHt9O1xuICAgICAgICBpbWFnZS5jcm9zc09yaWdpbiA9ICdhbm9ueW1vdXMnO1xuXG4gICAgaWYgKCFpbWFnZS5zcmMpIGltYWdlLnNyYyA9IGlucHV0O1xuICAgIGlmICghaW1hZ2UuY29tcGxldGUpIHtcbiAgICAgICAgaW1hZ2Uub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2FsbGJhY2soaW1hZ2UpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2soaW1hZ2UpO1xuICAgIH1cblxuICAgIHJldHVybiBpbWFnZTtcbn1cblxuLyoqXG4gKiBTZXRzIGFjdGl2ZSB0ZXh0dXJlIHNsb3QgYW5kIGJpbmRzIHRhcmdldCB0ZXh0dXJlLiAgQWxzbyBoYW5kbGVzXG4gKiByZXNhbXBsaW5nIHdoZW4gbmVjZXNzYXJ5LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gaWQgSWRlbnRpZmllciB1c2VkIHRvIHJldHJlaXZlIHRleHR1cmUgc3BlY1xuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cblRleHR1cmVNYW5hZ2VyLnByb3RvdHlwZS5iaW5kVGV4dHVyZSA9IGZ1bmN0aW9uIGJpbmRUZXh0dXJlKGlkKSB7XG4gICAgdmFyIHNwZWMgPSB0aGlzLnJlZ2lzdHJ5W2lkXTtcblxuICAgIGlmICh0aGlzLl9hY3RpdmVUZXh0dXJlICE9PSBzcGVjLnNsb3QpIHtcbiAgICAgICAgdGhpcy5nbC5hY3RpdmVUZXh0dXJlKHRoaXMuZ2wuVEVYVFVSRTAgKyBzcGVjLnNsb3QpO1xuICAgICAgICB0aGlzLl9hY3RpdmVUZXh0dXJlID0gc3BlYy5zbG90O1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ib3VuZFRleHR1cmUgIT09IGlkKSB7XG4gICAgICAgIHRoaXMuX2JvdW5kVGV4dHVyZSA9IGlkO1xuICAgICAgICBzcGVjLnRleHR1cmUuYmluZCgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9uZWVkc1Jlc2FtcGxlW3NwZWMuaWRdKSB7XG5cbiAgICAgICAgLy8gVE9ETzogQWNjb3VudCBmb3IgcmVzYW1wbGluZyBvZiBhcnJheXMuXG5cbiAgICAgICAgc3BlYy50ZXh0dXJlLnNldEltYWdlKHNwZWMuc291cmNlKTtcbiAgICAgICAgdGhpcy5fbmVlZHNSZXNhbXBsZVtzcGVjLmlkXSA9IGZhbHNlO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVGV4dHVyZU1hbmFnZXI7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBQcm9ncmFtID0gcmVxdWlyZSgnLi9Qcm9ncmFtJyk7XG52YXIgQnVmZmVyUmVnaXN0cnkgPSByZXF1aXJlKCcuL0J1ZmZlclJlZ2lzdHJ5Jyk7XG52YXIgUGxhbmUgPSByZXF1aXJlKCcuLi93ZWJnbC1nZW9tZXRyaWVzL3ByaW1pdGl2ZXMvUGxhbmUnKTtcbnZhciBzb3J0ZXIgPSByZXF1aXJlKCcuL3JhZGl4U29ydCcpO1xudmFyIGtleVZhbHVlVG9BcnJheXMgPSByZXF1aXJlKCcuLi91dGlsaXRpZXMva2V5VmFsdWVUb0FycmF5cycpO1xudmFyIFRleHR1cmVNYW5hZ2VyID0gcmVxdWlyZSgnLi9UZXh0dXJlTWFuYWdlcicpO1xudmFyIGNvbXBpbGVNYXRlcmlhbCA9IHJlcXVpcmUoJy4vY29tcGlsZU1hdGVyaWFsJyk7XG5cbnZhciBpZGVudGl0eSA9IFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXTtcblxudmFyIGdsb2JhbFVuaWZvcm1zID0ga2V5VmFsdWVUb0FycmF5cyh7XG4gICAgJ3VfbnVtTGlnaHRzJzogMCxcbiAgICAndV9hbWJpZW50TGlnaHQnOiBuZXcgQXJyYXkoMyksXG4gICAgJ3VfbGlnaHRQb3NpdGlvbic6IG5ldyBBcnJheSgzKSxcbiAgICAndV9saWdodENvbG9yJzogbmV3IEFycmF5KDMpLFxuICAgICd1X3BlcnNwZWN0aXZlJzogbmV3IEFycmF5KDE2KSxcbiAgICAndV90aW1lJzogMCxcbiAgICAndV92aWV3JzogbmV3IEFycmF5KDE2KVxufSk7XG5cbi8qKlxuICogV2ViR0xSZW5kZXJlciBpcyBhIHByaXZhdGUgY2xhc3MgdGhhdCBtYW5hZ2VzIGFsbCBpbnRlcmFjdGlvbnMgd2l0aCB0aGUgV2ViR0xcbiAqIEFQSS4gRWFjaCBmcmFtZSBpdCByZWNlaXZlcyBjb21tYW5kcyBmcm9tIHRoZSBjb21wb3NpdG9yIGFuZCB1cGRhdGVzIGl0c1xuICogcmVnaXN0cmllcyBhY2NvcmRpbmdseS4gU3Vic2VxdWVudGx5LCB0aGUgZHJhdyBmdW5jdGlvbiBpcyBjYWxsZWQgYW5kIHRoZVxuICogV2ViR0xSZW5kZXJlciBpc3N1ZXMgZHJhdyBjYWxscyBmb3IgYWxsIG1lc2hlcyBpbiBpdHMgcmVnaXN0cnkuXG4gKlxuICogQGNsYXNzIFdlYkdMUmVuZGVyZXJcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gY2FudmFzIFRoZSBET00gZWxlbWVudCB0aGF0IEdMIHdpbGwgcGFpbnQgaXRzZWxmIG9udG8uXG4gKiBAcGFyYW0ge0NvbXBvc2l0b3J9IGNvbXBvc2l0b3IgQ29tcG9zaXRvciB1c2VkIGZvciBxdWVyeWluZyB0aGUgdGltZSBmcm9tLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbmZ1bmN0aW9uIFdlYkdMUmVuZGVyZXIoY2FudmFzLCBjb21wb3NpdG9yKSB7XG4gICAgY2FudmFzLmNsYXNzTGlzdC5hZGQoJ2ZhbW91cy13ZWJnbC1yZW5kZXJlcicpO1xuXG4gICAgdGhpcy5jYW52YXMgPSBjYW52YXM7XG4gICAgdGhpcy5jb21wb3NpdG9yID0gY29tcG9zaXRvcjtcblxuICAgIGZvciAodmFyIGtleSBpbiB0aGlzLmNvbnN0cnVjdG9yLkRFRkFVTFRfU1RZTEVTKSB7XG4gICAgICAgIHRoaXMuY2FudmFzLnN0eWxlW2tleV0gPSB0aGlzLmNvbnN0cnVjdG9yLkRFRkFVTFRfU1RZTEVTW2tleV07XG4gICAgfVxuXG4gICAgdmFyIGdsID0gdGhpcy5nbCA9IHRoaXMuZ2V0V2ViR0xDb250ZXh0KHRoaXMuY2FudmFzKTtcblxuICAgIGdsLmNsZWFyQ29sb3IoMC4wLCAwLjAsIDAuMCwgMC4wKTtcbiAgICBnbC5wb2x5Z29uT2Zmc2V0KDAuMSwgMC4xKTtcbiAgICBnbC5lbmFibGUoZ2wuUE9MWUdPTl9PRkZTRVRfRklMTCk7XG4gICAgZ2wuZW5hYmxlKGdsLkRFUFRIX1RFU1QpO1xuICAgIGdsLmVuYWJsZShnbC5CTEVORCk7XG4gICAgZ2wuZGVwdGhGdW5jKGdsLkxFUVVBTCk7XG4gICAgZ2wuYmxlbmRGdW5jKGdsLlNSQ19BTFBIQSwgZ2wuT05FX01JTlVTX1NSQ19BTFBIQSk7XG4gICAgZ2wuZW5hYmxlKGdsLkNVTExfRkFDRSk7XG4gICAgZ2wuY3VsbEZhY2UoZ2wuQkFDSyk7XG5cbiAgICB0aGlzLm1lc2hSZWdpc3RyeSA9IHt9O1xuICAgIHRoaXMubWVzaFJlZ2lzdHJ5S2V5cyA9IFtdO1xuXG4gICAgdGhpcy5jdXRvdXRSZWdpc3RyeSA9IHt9O1xuXG4gICAgdGhpcy5jdXRvdXRSZWdpc3RyeUtleXMgPSBbXTtcblxuICAgIC8qKlxuICAgICAqIExpZ2h0c1xuICAgICAqL1xuICAgIHRoaXMubnVtTGlnaHRzID0gMDtcbiAgICB0aGlzLmFtYmllbnRMaWdodENvbG9yID0gWzAsIDAsIDBdO1xuICAgIHRoaXMubGlnaHRSZWdpc3RyeSA9IHt9O1xuICAgIHRoaXMubGlnaHRSZWdpc3RyeUtleXMgPSBbXTtcbiAgICB0aGlzLmxpZ2h0UG9zaXRpb25zID0gWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdO1xuICAgIHRoaXMubGlnaHRDb2xvcnMgPSBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF07XG5cbiAgICB0aGlzLnRleHR1cmVNYW5hZ2VyID0gbmV3IFRleHR1cmVNYW5hZ2VyKGdsKTtcbiAgICB0aGlzLnRleENhY2hlID0ge307XG4gICAgdGhpcy5idWZmZXJSZWdpc3RyeSA9IG5ldyBCdWZmZXJSZWdpc3RyeShnbCk7XG4gICAgdGhpcy5wcm9ncmFtID0gbmV3IFByb2dyYW0oZ2wsIHsgZGVidWc6IHRydWUgfSk7XG5cbiAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgICBib3VuZEFycmF5QnVmZmVyOiBudWxsLFxuICAgICAgICBib3VuZEVsZW1lbnRCdWZmZXI6IG51bGwsXG4gICAgICAgIGxhc3REcmF3bjogbnVsbCxcbiAgICAgICAgZW5hYmxlZEF0dHJpYnV0ZXM6IHt9LFxuICAgICAgICBlbmFibGVkQXR0cmlidXRlc0tleXM6IFtdXG4gICAgfTtcblxuICAgIHRoaXMucmVzb2x1dGlvbk5hbWUgPSBbJ3VfcmVzb2x1dGlvbiddO1xuICAgIHRoaXMucmVzb2x1dGlvblZhbHVlcyA9IFtdO1xuXG4gICAgdGhpcy5jYWNoZWRTaXplID0gW107XG5cbiAgICAvKlxuICAgIFRoZSBwcm9qZWN0aW9uVHJhbnNmb3JtIGhhcyBzb21lIGNvbnN0YW50IGNvbXBvbmVudHMsIGkuZS4gdGhlIHogc2NhbGUsIGFuZCB0aGUgeCBhbmQgeSB0cmFuc2xhdGlvbi5cblxuICAgIFRoZSB6IHNjYWxlIGtlZXBzIHRoZSBmaW5hbCB6IHBvc2l0aW9uIG9mIGFueSB2ZXJ0ZXggd2l0aGluIHRoZSBjbGlwJ3MgZG9tYWluIGJ5IHNjYWxpbmcgaXQgYnkgYW5cbiAgICBhcmJpdHJhcmlseSBzbWFsbCBjb2VmZmljaWVudC4gVGhpcyBoYXMgdGhlIGFkdmFudGFnZSBvZiBiZWluZyBhIHVzZWZ1bCBkZWZhdWx0IGluIHRoZSBldmVudCBvZiB0aGVcbiAgICB1c2VyIGZvcmdvaW5nIGEgbmVhciBhbmQgZmFyIHBsYW5lLCBhbiBhbGllbiBjb252ZW50aW9uIGluIGRvbSBzcGFjZSBhcyBpbiBET00gb3ZlcmxhcHBpbmcgaXNcbiAgICBjb25kdWN0ZWQgdmlhIHBhaW50ZXIncyBhbGdvcml0aG0uXG5cbiAgICBUaGUgeCBhbmQgeSB0cmFuc2xhdGlvbiB0cmFuc2Zvcm1zIHRoZSB3b3JsZCBzcGFjZSBvcmlnaW4gdG8gdGhlIHRvcCBsZWZ0IGNvcm5lciBvZiB0aGUgc2NyZWVuLlxuXG4gICAgVGhlIGZpbmFsIGNvbXBvbmVudCAodGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtWzE1XSkgaXMgaW5pdGlhbGl6ZWQgYXMgMSBiZWNhdXNlIGNlcnRhaW4gcHJvamVjdGlvbiBtb2RlbHMsXG4gICAgZS5nLiB0aGUgV0MzIHNwZWNpZmllZCBtb2RlbCwga2VlcCB0aGUgWFkgcGxhbmUgYXMgdGhlIHByb2plY3Rpb24gaHlwZXJwbGFuZS5cbiAgICAqL1xuICAgIHRoaXMucHJvamVjdGlvblRyYW5zZm9ybSA9IFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAtMC4wMDAwMDEsIDAsIC0xLCAxLCAwLCAxXTtcblxuICAgIC8vIFRPRE86IHJlbW92ZSB0aGlzIGhhY2tcblxuICAgIHZhciBjdXRvdXQgPSB0aGlzLmN1dG91dEdlb21ldHJ5ID0gbmV3IFBsYW5lKCk7XG5cbiAgICB0aGlzLmJ1ZmZlclJlZ2lzdHJ5LmFsbG9jYXRlKGN1dG91dC5zcGVjLmlkLCAnYV9wb3MnLCBjdXRvdXQuc3BlYy5idWZmZXJWYWx1ZXNbMF0sIDMpO1xuICAgIHRoaXMuYnVmZmVyUmVnaXN0cnkuYWxsb2NhdGUoY3V0b3V0LnNwZWMuaWQsICdhX3RleENvb3JkJywgY3V0b3V0LnNwZWMuYnVmZmVyVmFsdWVzWzFdLCAyKTtcbiAgICB0aGlzLmJ1ZmZlclJlZ2lzdHJ5LmFsbG9jYXRlKGN1dG91dC5zcGVjLmlkLCAnYV9ub3JtYWxzJywgY3V0b3V0LnNwZWMuYnVmZmVyVmFsdWVzWzJdLCAzKTtcbiAgICB0aGlzLmJ1ZmZlclJlZ2lzdHJ5LmFsbG9jYXRlKGN1dG91dC5zcGVjLmlkLCAnaW5kaWNlcycsIGN1dG91dC5zcGVjLmJ1ZmZlclZhbHVlc1szXSwgMSk7XG59XG5cbi8qKlxuICogQXR0ZW1wdHMgdG8gcmV0cmVpdmUgdGhlIFdlYkdMUmVuZGVyZXIgY29udGV4dCB1c2luZyBzZXZlcmFsXG4gKiBhY2Nlc3NvcnMuIEZvciBicm93c2VyIGNvbXBhdGFiaWxpdHkuIFRocm93cyBvbiBlcnJvci5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGNhbnZhcyBDYW52YXMgZWxlbWVudCBmcm9tIHdoaWNoIHRoZSBjb250ZXh0IGlzIHJldHJlaXZlZFxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gV2ViR0xDb250ZXh0IG9mIGNhbnZhcyBlbGVtZW50XG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmdldFdlYkdMQ29udGV4dCA9IGZ1bmN0aW9uIGdldFdlYkdMQ29udGV4dChjYW52YXMpIHtcbiAgICB2YXIgbmFtZXMgPSBbJ3dlYmdsJywgJ2V4cGVyaW1lbnRhbC13ZWJnbCcsICd3ZWJraXQtM2QnLCAnbW96LXdlYmdsJ107XG4gICAgdmFyIGNvbnRleHQgPSBudWxsO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dChuYW1lc1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICB2YXIgbXNnID0gJ0Vycm9yIGNyZWF0aW5nIFdlYkdMIGNvbnRleHQ6ICcgKyBlcnJvci5wcm90b3R5cGUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbnRleHQgPyBjb250ZXh0IDogZmFsc2U7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgYmFzZSBzcGVjIHRvIHRoZSBsaWdodCByZWdpc3RyeSBhdCBhIGdpdmVuIHBhdGguXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiBuZXcgbGlnaHQgaW4gbGlnaHRSZWdpc3RyeVxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gTmV3bHkgY3JlYXRlZCBsaWdodCBzcGVjXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmNyZWF0ZUxpZ2h0ID0gZnVuY3Rpb24gY3JlYXRlTGlnaHQocGF0aCkge1xuICAgIHRoaXMubnVtTGlnaHRzKys7XG4gICAgdGhpcy5saWdodFJlZ2lzdHJ5S2V5cy5wdXNoKHBhdGgpO1xuICAgIHRoaXMubGlnaHRSZWdpc3RyeVtwYXRoXSA9IHtcbiAgICAgICAgY29sb3I6IFswLCAwLCAwXSxcbiAgICAgICAgcG9zaXRpb246IFswLCAwLCAwXVxuICAgIH07XG4gICAgcmV0dXJuIHRoaXMubGlnaHRSZWdpc3RyeVtwYXRoXTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBiYXNlIHNwZWMgdG8gdGhlIG1lc2ggcmVnaXN0cnkgYXQgYSBnaXZlbiBwYXRoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgbmV3IG1lc2ggaW4gbWVzaFJlZ2lzdHJ5LlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gTmV3bHkgY3JlYXRlZCBtZXNoIHNwZWMuXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmNyZWF0ZU1lc2ggPSBmdW5jdGlvbiBjcmVhdGVNZXNoKHBhdGgpIHtcbiAgICB0aGlzLm1lc2hSZWdpc3RyeUtleXMucHVzaChwYXRoKTtcblxuICAgIHZhciB1bmlmb3JtcyA9IGtleVZhbHVlVG9BcnJheXMoe1xuICAgICAgICB1X29wYWNpdHk6IDEsXG4gICAgICAgIHVfdHJhbnNmb3JtOiBpZGVudGl0eSxcbiAgICAgICAgdV9zaXplOiBbMCwgMCwgMF0sXG4gICAgICAgIHVfYmFzZUNvbG9yOiBbMC41LCAwLjUsIDAuNSwgMV0sXG4gICAgICAgIHVfcG9zaXRpb25PZmZzZXQ6IFswLCAwLCAwXSxcbiAgICAgICAgdV9ub3JtYWxzOiBbMCwgMCwgMF0sXG4gICAgICAgIHVfZmxhdFNoYWRpbmc6IDAsXG4gICAgICAgIHVfZ2xvc3NpbmVzczogWzAsIDAsIDAsIDBdXG4gICAgfSk7XG4gICAgdGhpcy5tZXNoUmVnaXN0cnlbcGF0aF0gPSB7XG4gICAgICAgIGRlcHRoOiBudWxsLFxuICAgICAgICB1bmlmb3JtS2V5czogdW5pZm9ybXMua2V5cyxcbiAgICAgICAgdW5pZm9ybVZhbHVlczogdW5pZm9ybXMudmFsdWVzLFxuICAgICAgICBidWZmZXJzOiB7fSxcbiAgICAgICAgZ2VvbWV0cnk6IG51bGwsXG4gICAgICAgIGRyYXdUeXBlOiBudWxsLFxuICAgICAgICB0ZXh0dXJlczogW10sXG4gICAgICAgIHZpc2libGU6IHRydWVcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLm1lc2hSZWdpc3RyeVtwYXRoXTtcbn07XG5cbi8qKlxuICogU2V0cyBmbGFnIG9uIGluZGljYXRpbmcgd2hldGhlciB0byBkbyBza2lwIGRyYXcgcGhhc2UgZm9yXG4gKiBjdXRvdXQgbWVzaCBhdCBnaXZlbiBwYXRoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgdGFyZ2V0IGN1dG91dCBtZXNoLlxuICogQHBhcmFtIHtCb29sZWFufSB1c2VzQ3V0b3V0IEluZGljYXRlcyB0aGUgcHJlc2VuY2Ugb2YgYSBjdXRvdXQgbWVzaFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldEN1dG91dFN0YXRlID0gZnVuY3Rpb24gc2V0Q3V0b3V0U3RhdGUocGF0aCwgdXNlc0N1dG91dCkge1xuICAgIHZhciBjdXRvdXQgPSB0aGlzLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuXG4gICAgY3V0b3V0LnZpc2libGUgPSB1c2VzQ3V0b3V0O1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIG9yIHJldHJlaXZlcyBjdXRvdXRcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIHRhcmdldCBjdXRvdXQgbWVzaC5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IE5ld2x5IGNyZWF0ZWQgY3V0b3V0IHNwZWMuXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmdldE9yU2V0Q3V0b3V0ID0gZnVuY3Rpb24gZ2V0T3JTZXRDdXRvdXQocGF0aCkge1xuICAgIGlmICh0aGlzLmN1dG91dFJlZ2lzdHJ5W3BhdGhdKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmN1dG91dFJlZ2lzdHJ5W3BhdGhdO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIHVuaWZvcm1zID0ga2V5VmFsdWVUb0FycmF5cyh7XG4gICAgICAgICAgICB1X29wYWNpdHk6IDAsXG4gICAgICAgICAgICB1X3RyYW5zZm9ybTogaWRlbnRpdHkuc2xpY2UoKSxcbiAgICAgICAgICAgIHVfc2l6ZTogWzAsIDAsIDBdLFxuICAgICAgICAgICAgdV9vcmlnaW46IFswLCAwLCAwXSxcbiAgICAgICAgICAgIHVfYmFzZUNvbG9yOiBbMCwgMCwgMCwgMV1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5jdXRvdXRSZWdpc3RyeUtleXMucHVzaChwYXRoKTtcblxuICAgICAgICB0aGlzLmN1dG91dFJlZ2lzdHJ5W3BhdGhdID0ge1xuICAgICAgICAgICAgdW5pZm9ybUtleXM6IHVuaWZvcm1zLmtleXMsXG4gICAgICAgICAgICB1bmlmb3JtVmFsdWVzOiB1bmlmb3Jtcy52YWx1ZXMsXG4gICAgICAgICAgICBnZW9tZXRyeTogdGhpcy5jdXRvdXRHZW9tZXRyeS5zcGVjLmlkLFxuICAgICAgICAgICAgZHJhd1R5cGU6IHRoaXMuY3V0b3V0R2VvbWV0cnkuc3BlYy50eXBlLFxuICAgICAgICAgICAgdmlzaWJsZTogdHJ1ZVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiB0aGlzLmN1dG91dFJlZ2lzdHJ5W3BhdGhdO1xuICAgIH1cbn07XG5cbi8qKlxuICogU2V0cyBmbGFnIG9uIGluZGljYXRpbmcgd2hldGhlciB0byBkbyBza2lwIGRyYXcgcGhhc2UgZm9yXG4gKiBtZXNoIGF0IGdpdmVuIHBhdGguXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIHRhcmdldCBtZXNoLlxuICogQHBhcmFtIHtCb29sZWFufSB2aXNpYmlsaXR5IEluZGljYXRlcyB0aGUgdmlzaWJpbGl0eSBvZiB0YXJnZXQgbWVzaC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5zZXRNZXNoVmlzaWJpbGl0eSA9IGZ1bmN0aW9uIHNldE1lc2hWaXNpYmlsaXR5KHBhdGgsIHZpc2liaWxpdHkpIHtcbiAgICB2YXIgbWVzaCA9IHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdIHx8IHRoaXMuY3JlYXRlTWVzaChwYXRoKTtcblxuICAgIG1lc2gudmlzaWJsZSA9IHZpc2liaWxpdHk7XG59O1xuXG4vKipcbiAqIERlbGV0ZXMgYSBtZXNoIGZyb20gdGhlIG1lc2hSZWdpc3RyeS5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgdGFyZ2V0IG1lc2guXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUucmVtb3ZlTWVzaCA9IGZ1bmN0aW9uIHJlbW92ZU1lc2gocGF0aCkge1xuICAgIHZhciBrZXlMb2NhdGlvbiA9IHRoaXMubWVzaFJlZ2lzdHJ5S2V5cy5pbmRleE9mKHBhdGgpO1xuICAgIHRoaXMubWVzaFJlZ2lzdHJ5S2V5cy5zcGxpY2Uoa2V5TG9jYXRpb24sIDEpO1xuICAgIHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdID0gbnVsbDtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBvciByZXRyZWl2ZXMgY3V0b3V0XG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIGN1dG91dCBpbiBjdXRvdXQgcmVnaXN0cnkuXG4gKiBAcGFyYW0ge1N0cmluZ30gdW5pZm9ybU5hbWUgSWRlbnRpZmllciB1c2VkIHRvIHVwbG9hZCB2YWx1ZVxuICogQHBhcmFtIHtBcnJheX0gdW5pZm9ybVZhbHVlIFZhbHVlIG9mIHVuaWZvcm0gZGF0YVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldEN1dG91dFVuaWZvcm0gPSBmdW5jdGlvbiBzZXRDdXRvdXRVbmlmb3JtKHBhdGgsIHVuaWZvcm1OYW1lLCB1bmlmb3JtVmFsdWUpIHtcbiAgICB2YXIgY3V0b3V0ID0gdGhpcy5nZXRPclNldEN1dG91dChwYXRoKTtcblxuICAgIHZhciBpbmRleCA9IGN1dG91dC51bmlmb3JtS2V5cy5pbmRleE9mKHVuaWZvcm1OYW1lKTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KHVuaWZvcm1WYWx1ZSkpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHVuaWZvcm1WYWx1ZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgY3V0b3V0LnVuaWZvcm1WYWx1ZXNbaW5kZXhdW2ldID0gdW5pZm9ybVZhbHVlW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjdXRvdXQudW5pZm9ybVZhbHVlc1tpbmRleF0gPSB1bmlmb3JtVmFsdWU7XG4gICAgfVxufTtcblxuLyoqXG4gKiBFZGl0cyB0aGUgb3B0aW9ucyBmaWVsZCBvbiBhIG1lc2hcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgdGFyZ2V0IG1lc2hcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIE1hcCBvZiBkcmF3IG9wdGlvbnMgZm9yIG1lc2hcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuKiovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5zZXRNZXNoT3B0aW9ucyA9IGZ1bmN0aW9uKHBhdGgsIG9wdGlvbnMpIHtcbiAgICB2YXIgbWVzaCA9IHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdIHx8IHRoaXMuY3JlYXRlTWVzaChwYXRoKTtcblxuICAgIG1lc2gub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENoYW5nZXMgdGhlIGNvbG9yIG9mIHRoZSBmaXhlZCBpbnRlbnNpdHkgbGlnaHRpbmcgaW4gdGhlIHNjZW5lXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiBsaWdodFxuICogQHBhcmFtIHtOdW1iZXJ9IHIgcmVkIGNoYW5uZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBnIGdyZWVuIGNoYW5uZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBiIGJsdWUgY2hhbm5lbFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4qKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldEFtYmllbnRMaWdodENvbG9yID0gZnVuY3Rpb24gc2V0QW1iaWVudExpZ2h0Q29sb3IocGF0aCwgciwgZywgYikge1xuICAgIHRoaXMuYW1iaWVudExpZ2h0Q29sb3JbMF0gPSByO1xuICAgIHRoaXMuYW1iaWVudExpZ2h0Q29sb3JbMV0gPSBnO1xuICAgIHRoaXMuYW1iaWVudExpZ2h0Q29sb3JbMl0gPSBiO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBsb2NhdGlvbiBvZiB0aGUgbGlnaHQgaW4gdGhlIHNjZW5lXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiBsaWdodFxuICogQHBhcmFtIHtOdW1iZXJ9IHggeCBwb3NpdGlvblxuICogQHBhcmFtIHtOdW1iZXJ9IHkgeSBwb3NpdGlvblxuICogQHBhcmFtIHtOdW1iZXJ9IHogeiBwb3NpdGlvblxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4qKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldExpZ2h0UG9zaXRpb24gPSBmdW5jdGlvbiBzZXRMaWdodFBvc2l0aW9uKHBhdGgsIHgsIHksIHopIHtcbiAgICB2YXIgbGlnaHQgPSB0aGlzLmxpZ2h0UmVnaXN0cnlbcGF0aF0gfHwgdGhpcy5jcmVhdGVMaWdodChwYXRoKTtcblxuICAgIGxpZ2h0LnBvc2l0aW9uWzBdID0geDtcbiAgICBsaWdodC5wb3NpdGlvblsxXSA9IHk7XG4gICAgbGlnaHQucG9zaXRpb25bMl0gPSB6O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBjb2xvciBvZiBhIGR5bmFtaWMgaW50ZW5zaXR5IGxpZ2h0aW5nIGluIHRoZSBzY2VuZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgbGlnaHQgaW4gbGlnaHQgUmVnaXN0cnkuXG4gKiBAcGFyYW0ge051bWJlcn0gciByZWQgY2hhbm5lbFxuICogQHBhcmFtIHtOdW1iZXJ9IGcgZ3JlZW4gY2hhbm5lbFxuICogQHBhcmFtIHtOdW1iZXJ9IGIgYmx1ZSBjaGFubmVsXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbioqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuc2V0TGlnaHRDb2xvciA9IGZ1bmN0aW9uIHNldExpZ2h0Q29sb3IocGF0aCwgciwgZywgYikge1xuICAgIHZhciBsaWdodCA9IHRoaXMubGlnaHRSZWdpc3RyeVtwYXRoXSB8fCB0aGlzLmNyZWF0ZUxpZ2h0KHBhdGgpO1xuXG4gICAgbGlnaHQuY29sb3JbMF0gPSByO1xuICAgIGxpZ2h0LmNvbG9yWzFdID0gZztcbiAgICBsaWdodC5jb2xvclsyXSA9IGI7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENvbXBpbGVzIG1hdGVyaWFsIHNwZWMgaW50byBwcm9ncmFtIHNoYWRlclxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgY3V0b3V0IGluIGN1dG91dCByZWdpc3RyeS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIE5hbWUgdGhhdCB0aGUgcmVuZGVyaW5nIGlucHV0IHRoZSBtYXRlcmlhbCBpcyBib3VuZCB0b1xuICogQHBhcmFtIHtPYmplY3R9IG1hdGVyaWFsIE1hdGVyaWFsIHNwZWNcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuKiovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5oYW5kbGVNYXRlcmlhbElucHV0ID0gZnVuY3Rpb24gaGFuZGxlTWF0ZXJpYWxJbnB1dChwYXRoLCBuYW1lLCBtYXRlcmlhbCkge1xuICAgIHZhciBtZXNoID0gdGhpcy5tZXNoUmVnaXN0cnlbcGF0aF0gfHwgdGhpcy5jcmVhdGVNZXNoKHBhdGgpO1xuICAgIG1hdGVyaWFsID0gY29tcGlsZU1hdGVyaWFsKG1hdGVyaWFsLCBtZXNoLnRleHR1cmVzLmxlbmd0aCk7XG5cbiAgICAvLyBTZXQgdW5pZm9ybXMgdG8gZW5hYmxlIHRleHR1cmUhXG5cbiAgICBtZXNoLnVuaWZvcm1WYWx1ZXNbbWVzaC51bmlmb3JtS2V5cy5pbmRleE9mKG5hbWUpXVswXSA9IC1tYXRlcmlhbC5faWQ7XG5cbiAgICAvLyBSZWdpc3RlciB0ZXh0dXJlcyFcblxuICAgIHZhciBpID0gbWF0ZXJpYWwudGV4dHVyZXMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgbWVzaC50ZXh0dXJlcy5wdXNoKFxuICAgICAgICAgICAgdGhpcy50ZXh0dXJlTWFuYWdlci5yZWdpc3RlcihtYXRlcmlhbC50ZXh0dXJlc1tpXSwgbWVzaC50ZXh0dXJlcy5sZW5ndGggKyBpKVxuICAgICAgICApO1xuICAgIH1cblxuICAgIC8vIFJlZ2lzdGVyIG1hdGVyaWFsIVxuXG4gICAgdGhpcy5wcm9ncmFtLnJlZ2lzdGVyTWF0ZXJpYWwobmFtZSwgbWF0ZXJpYWwpO1xuXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlU2l6ZSgpO1xufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBnZW9tZXRyeSBkYXRhIG9mIGEgbWVzaFxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgY3V0b3V0IGluIGN1dG91dCByZWdpc3RyeS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBnZW9tZXRyeSBHZW9tZXRyeSBvYmplY3QgY29udGFpbmluZyB2ZXJ0ZXggZGF0YSB0byBiZSBkcmF3blxuICogQHBhcmFtIHtOdW1iZXJ9IGRyYXdUeXBlIFByaW1pdGl2ZSBpZGVudGlmaWVyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGR5bmFtaWMgV2hldGhlciBnZW9tZXRyeSBpcyBkeW5hbWljXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbioqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuc2V0R2VvbWV0cnkgPSBmdW5jdGlvbiBzZXRHZW9tZXRyeShwYXRoLCBnZW9tZXRyeSwgZHJhd1R5cGUsIGR5bmFtaWMpIHtcbiAgICB2YXIgbWVzaCA9IHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdIHx8IHRoaXMuY3JlYXRlTWVzaChwYXRoKTtcblxuICAgIG1lc2guZ2VvbWV0cnkgPSBnZW9tZXRyeTtcbiAgICBtZXNoLmRyYXdUeXBlID0gZHJhd1R5cGU7XG4gICAgbWVzaC5keW5hbWljID0gZHluYW1pYztcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBVcGxvYWRzIGEgbmV3IHZhbHVlIGZvciB0aGUgdW5pZm9ybSBkYXRhIHdoZW4gdGhlIG1lc2ggaXMgYmVpbmcgZHJhd25cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIG1lc2ggaW4gbWVzaCByZWdpc3RyeVxuICogQHBhcmFtIHtTdHJpbmd9IHVuaWZvcm1OYW1lIElkZW50aWZpZXIgdXNlZCB0byB1cGxvYWQgdmFsdWVcbiAqIEBwYXJhbSB7QXJyYXl9IHVuaWZvcm1WYWx1ZSBWYWx1ZSBvZiB1bmlmb3JtIGRhdGFcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuKiovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5zZXRNZXNoVW5pZm9ybSA9IGZ1bmN0aW9uIHNldE1lc2hVbmlmb3JtKHBhdGgsIHVuaWZvcm1OYW1lLCB1bmlmb3JtVmFsdWUpIHtcbiAgICB2YXIgbWVzaCA9IHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdIHx8IHRoaXMuY3JlYXRlTWVzaChwYXRoKTtcblxuICAgIHZhciBpbmRleCA9IG1lc2gudW5pZm9ybUtleXMuaW5kZXhPZih1bmlmb3JtTmFtZSk7XG5cbiAgICBpZiAoaW5kZXggPT09IC0xKSB7XG4gICAgICAgIG1lc2gudW5pZm9ybUtleXMucHVzaCh1bmlmb3JtTmFtZSk7XG4gICAgICAgIG1lc2gudW5pZm9ybVZhbHVlcy5wdXNoKHVuaWZvcm1WYWx1ZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBtZXNoLnVuaWZvcm1WYWx1ZXNbaW5kZXhdID0gdW5pZm9ybVZhbHVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogVHJpZ2dlcnMgdGhlICdkcmF3JyBwaGFzZSBvZiB0aGUgV2ViR0xSZW5kZXJlci4gSXRlcmF0ZXMgdGhyb3VnaCByZWdpc3RyaWVzXG4gKiB0byBzZXQgdW5pZm9ybXMsIHNldCBhdHRyaWJ1dGVzIGFuZCBpc3N1ZSBkcmF3IGNvbW1hbmRzIGZvciByZW5kZXJhYmxlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIG1lc2ggaW4gbWVzaCByZWdpc3RyeVxuICogQHBhcmFtIHtOdW1iZXJ9IGdlb21ldHJ5SWQgSWQgb2YgZ2VvbWV0cnkgaW4gZ2VvbWV0cnkgcmVnaXN0cnlcbiAqIEBwYXJhbSB7U3RyaW5nfSBidWZmZXJOYW1lIEF0dHJpYnV0ZSBsb2NhdGlvbiBuYW1lXG4gKiBAcGFyYW0ge0FycmF5fSBidWZmZXJWYWx1ZSBWZXJ0ZXggZGF0YVxuICogQHBhcmFtIHtOdW1iZXJ9IGJ1ZmZlclNwYWNpbmcgVGhlIGRpbWVuc2lvbnMgb2YgdGhlIHZlcnRleFxuICogQHBhcmFtIHtCb29sZWFufSBpc0R5bmFtaWMgV2hldGhlciBnZW9tZXRyeSBpcyBkeW5hbWljXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuYnVmZmVyRGF0YSA9IGZ1bmN0aW9uIGJ1ZmZlckRhdGEocGF0aCwgZ2VvbWV0cnlJZCwgYnVmZmVyTmFtZSwgYnVmZmVyVmFsdWUsIGJ1ZmZlclNwYWNpbmcsIGlzRHluYW1pYykge1xuICAgIHRoaXMuYnVmZmVyUmVnaXN0cnkuYWxsb2NhdGUoZ2VvbWV0cnlJZCwgYnVmZmVyTmFtZSwgYnVmZmVyVmFsdWUsIGJ1ZmZlclNwYWNpbmcsIGlzRHluYW1pYyk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogVHJpZ2dlcnMgdGhlICdkcmF3JyBwaGFzZSBvZiB0aGUgV2ViR0xSZW5kZXJlci4gSXRlcmF0ZXMgdGhyb3VnaCByZWdpc3RyaWVzXG4gKiB0byBzZXQgdW5pZm9ybXMsIHNldCBhdHRyaWJ1dGVzIGFuZCBpc3N1ZSBkcmF3IGNvbW1hbmRzIGZvciByZW5kZXJhYmxlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlbmRlclN0YXRlIFBhcmFtZXRlcnMgcHJvdmlkZWQgYnkgdGhlIGNvbXBvc2l0b3IsIHRoYXQgYWZmZWN0IHRoZSByZW5kZXJpbmcgb2YgYWxsIHJlbmRlcmFibGVzLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiBkcmF3KHJlbmRlclN0YXRlKSB7XG4gICAgdmFyIHRpbWUgPSB0aGlzLmNvbXBvc2l0b3IuZ2V0VGltZSgpO1xuXG4gICAgdGhpcy5nbC5jbGVhcih0aGlzLmdsLkNPTE9SX0JVRkZFUl9CSVQgfCB0aGlzLmdsLkRFUFRIX0JVRkZFUl9CSVQpO1xuICAgIHRoaXMudGV4dHVyZU1hbmFnZXIudXBkYXRlKHRpbWUpO1xuXG4gICAgdGhpcy5tZXNoUmVnaXN0cnlLZXlzID0gc29ydGVyKHRoaXMubWVzaFJlZ2lzdHJ5S2V5cywgdGhpcy5tZXNoUmVnaXN0cnkpO1xuXG4gICAgdGhpcy5zZXRHbG9iYWxVbmlmb3JtcyhyZW5kZXJTdGF0ZSk7XG4gICAgdGhpcy5kcmF3Q3V0b3V0cygpO1xuICAgIHRoaXMuZHJhd01lc2hlcygpO1xufTtcblxuLyoqXG4gKiBJdGVyYXRlcyB0aHJvdWdoIGFuZCBkcmF3cyBhbGwgcmVnaXN0ZXJlZCBtZXNoZXMuIFRoaXMgaW5jbHVkZXNcbiAqIGJpbmRpbmcgdGV4dHVyZXMsIGhhbmRsaW5nIGRyYXcgb3B0aW9ucywgc2V0dGluZyBtZXNoIHVuaWZvcm1zXG4gKiBhbmQgZHJhd2luZyBtZXNoIGJ1ZmZlcnMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmRyYXdNZXNoZXMgPSBmdW5jdGlvbiBkcmF3TWVzaGVzKCkge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgdmFyIGJ1ZmZlcnM7XG4gICAgdmFyIG1lc2g7XG5cbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5tZXNoUmVnaXN0cnlLZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG1lc2ggPSB0aGlzLm1lc2hSZWdpc3RyeVt0aGlzLm1lc2hSZWdpc3RyeUtleXNbaV1dO1xuICAgICAgICBidWZmZXJzID0gdGhpcy5idWZmZXJSZWdpc3RyeS5yZWdpc3RyeVttZXNoLmdlb21ldHJ5XTtcblxuICAgICAgICBpZiAoIW1lc2gudmlzaWJsZSkgY29udGludWU7XG5cbiAgICAgICAgaWYgKG1lc2gudW5pZm9ybVZhbHVlc1swXSA8IDEpIHtcbiAgICAgICAgICAgIGdsLmRlcHRoTWFzayhmYWxzZSk7XG4gICAgICAgICAgICBnbC5lbmFibGUoZ2wuQkxFTkQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZ2wuZGVwdGhNYXNrKHRydWUpO1xuICAgICAgICAgICAgZ2wuZGlzYWJsZShnbC5CTEVORCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWJ1ZmZlcnMpIGNvbnRpbnVlO1xuXG4gICAgICAgIHZhciBqID0gbWVzaC50ZXh0dXJlcy5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChqLS0pIHRoaXMudGV4dHVyZU1hbmFnZXIuYmluZFRleHR1cmUobWVzaC50ZXh0dXJlc1tqXSk7XG5cbiAgICAgICAgaWYgKG1lc2gub3B0aW9ucykgdGhpcy5oYW5kbGVPcHRpb25zKG1lc2gub3B0aW9ucywgbWVzaCk7XG5cbiAgICAgICAgdGhpcy5wcm9ncmFtLnNldFVuaWZvcm1zKG1lc2gudW5pZm9ybUtleXMsIG1lc2gudW5pZm9ybVZhbHVlcyk7XG4gICAgICAgIHRoaXMuZHJhd0J1ZmZlcnMoYnVmZmVycywgbWVzaC5kcmF3VHlwZSwgbWVzaC5nZW9tZXRyeSk7XG5cbiAgICAgICAgaWYgKG1lc2gub3B0aW9ucykgdGhpcy5yZXNldE9wdGlvbnMobWVzaC5vcHRpb25zKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEl0ZXJhdGVzIHRocm91Z2ggYW5kIGRyYXdzIGFsbCByZWdpc3RlcmVkIGN1dG91dCBtZXNoZXMuIEJsZW5kaW5nXG4gKiBpcyBkaXNhYmxlZCwgY3V0b3V0IHVuaWZvcm1zIGFyZSBzZXQgYW5kIGZpbmFsbHkgYnVmZmVycyBhcmUgZHJhd24uXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmRyYXdDdXRvdXRzID0gZnVuY3Rpb24gZHJhd0N1dG91dHMoKSB7XG4gICAgdmFyIGN1dG91dDtcbiAgICB2YXIgYnVmZmVycztcbiAgICB2YXIgbGVuID0gdGhpcy5jdXRvdXRSZWdpc3RyeUtleXMubGVuZ3RoO1xuXG4gICAgaWYgKGxlbikge1xuICAgICAgICB0aGlzLmdsLmVuYWJsZSh0aGlzLmdsLkJMRU5EKTtcbiAgICAgICAgdGhpcy5nbC5kZXB0aE1hc2sodHJ1ZSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBjdXRvdXQgPSB0aGlzLmN1dG91dFJlZ2lzdHJ5W3RoaXMuY3V0b3V0UmVnaXN0cnlLZXlzW2ldXTtcbiAgICAgICAgYnVmZmVycyA9IHRoaXMuYnVmZmVyUmVnaXN0cnkucmVnaXN0cnlbY3V0b3V0Lmdlb21ldHJ5XTtcblxuICAgICAgICBpZiAoIWN1dG91dC52aXNpYmxlKSBjb250aW51ZTtcblxuICAgICAgICB0aGlzLnByb2dyYW0uc2V0VW5pZm9ybXMoY3V0b3V0LnVuaWZvcm1LZXlzLCBjdXRvdXQudW5pZm9ybVZhbHVlcyk7XG4gICAgICAgIHRoaXMuZHJhd0J1ZmZlcnMoYnVmZmVycywgY3V0b3V0LmRyYXdUeXBlLCBjdXRvdXQuZ2VvbWV0cnkpO1xuICAgIH1cbn07XG5cbi8qKlxuICogU2V0cyB1bmlmb3JtcyB0byBiZSBzaGFyZWQgYnkgYWxsIG1lc2hlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlbmRlclN0YXRlIERyYXcgc3RhdGUgb3B0aW9ucyBwYXNzZWQgZG93biBmcm9tIGNvbXBvc2l0b3IuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuc2V0R2xvYmFsVW5pZm9ybXMgPSBmdW5jdGlvbiBzZXRHbG9iYWxVbmlmb3JtcyhyZW5kZXJTdGF0ZSkge1xuICAgIHZhciBsaWdodDtcbiAgICB2YXIgc3RyaWRlO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMubGlnaHRSZWdpc3RyeUtleXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgbGlnaHQgPSB0aGlzLmxpZ2h0UmVnaXN0cnlbdGhpcy5saWdodFJlZ2lzdHJ5S2V5c1tpXV07XG4gICAgICAgIHN0cmlkZSA9IGkgKiA0O1xuXG4gICAgICAgIC8vIEJ1aWxkIHRoZSBsaWdodCBwb3NpdGlvbnMnIDR4NCBtYXRyaXhcblxuICAgICAgICB0aGlzLmxpZ2h0UG9zaXRpb25zWzAgKyBzdHJpZGVdID0gbGlnaHQucG9zaXRpb25bMF07XG4gICAgICAgIHRoaXMubGlnaHRQb3NpdGlvbnNbMSArIHN0cmlkZV0gPSBsaWdodC5wb3NpdGlvblsxXTtcbiAgICAgICAgdGhpcy5saWdodFBvc2l0aW9uc1syICsgc3RyaWRlXSA9IGxpZ2h0LnBvc2l0aW9uWzJdO1xuXG4gICAgICAgIC8vIEJ1aWxkIHRoZSBsaWdodCBjb2xvcnMnIDR4NCBtYXRyaXhcblxuICAgICAgICB0aGlzLmxpZ2h0Q29sb3JzWzAgKyBzdHJpZGVdID0gbGlnaHQuY29sb3JbMF07XG4gICAgICAgIHRoaXMubGlnaHRDb2xvcnNbMSArIHN0cmlkZV0gPSBsaWdodC5jb2xvclsxXTtcbiAgICAgICAgdGhpcy5saWdodENvbG9yc1syICsgc3RyaWRlXSA9IGxpZ2h0LmNvbG9yWzJdO1xuICAgIH1cblxuICAgIGdsb2JhbFVuaWZvcm1zLnZhbHVlc1swXSA9IHRoaXMubnVtTGlnaHRzO1xuICAgIGdsb2JhbFVuaWZvcm1zLnZhbHVlc1sxXSA9IHRoaXMuYW1iaWVudExpZ2h0Q29sb3I7XG4gICAgZ2xvYmFsVW5pZm9ybXMudmFsdWVzWzJdID0gdGhpcy5saWdodFBvc2l0aW9ucztcbiAgICBnbG9iYWxVbmlmb3Jtcy52YWx1ZXNbM10gPSB0aGlzLmxpZ2h0Q29sb3JzO1xuXG4gICAgLypcbiAgICAgKiBTZXQgdGltZSBhbmQgcHJvamVjdGlvbiB1bmlmb3Jtc1xuICAgICAqIHByb2plY3Rpbmcgd29ybGQgc3BhY2UgaW50byBhIDJkIHBsYW5lIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjYW52YXMuXG4gICAgICogVGhlIHggYW5kIHkgc2NhbGUgKHRoaXMucHJvamVjdGlvblRyYW5zZm9ybVswXSBhbmQgdGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtWzVdIHJlc3BlY3RpdmVseSlcbiAgICAgKiBjb252ZXJ0IHRoZSBwcm9qZWN0ZWQgZ2VvbWV0cnkgYmFjayBpbnRvIGNsaXBzcGFjZS5cbiAgICAgKiBUaGUgcGVycGVjdGl2ZSBkaXZpZGUgKHRoaXMucHJvamVjdGlvblRyYW5zZm9ybVsxMV0pLCBhZGRzIHRoZSB6IHZhbHVlIG9mIHRoZSBwb2ludFxuICAgICAqIG11bHRpcGxpZWQgYnkgdGhlIHBlcnNwZWN0aXZlIGRpdmlkZSB0byB0aGUgdyB2YWx1ZSBvZiB0aGUgcG9pbnQuIEluIHRoZSBwcm9jZXNzXG4gICAgICogb2YgY29udmVydGluZyBmcm9tIGhvbW9nZW5vdXMgY29vcmRpbmF0ZXMgdG8gTkRDIChub3JtYWxpemVkIGRldmljZSBjb29yZGluYXRlcylcbiAgICAgKiB0aGUgeCBhbmQgeSB2YWx1ZXMgb2YgdGhlIHBvaW50IGFyZSBkaXZpZGVkIGJ5IHcsIHdoaWNoIGltcGxlbWVudHMgcGVyc3BlY3RpdmUuXG4gICAgICovXG4gICAgdGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtWzBdID0gMSAvICh0aGlzLmNhY2hlZFNpemVbMF0gKiAwLjUpO1xuICAgIHRoaXMucHJvamVjdGlvblRyYW5zZm9ybVs1XSA9IC0xIC8gKHRoaXMuY2FjaGVkU2l6ZVsxXSAqIDAuNSk7XG4gICAgdGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtWzExXSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzExXTtcblxuICAgIGdsb2JhbFVuaWZvcm1zLnZhbHVlc1s0XSA9IHRoaXMucHJvamVjdGlvblRyYW5zZm9ybTtcbiAgICBnbG9iYWxVbmlmb3Jtcy52YWx1ZXNbNV0gPSB0aGlzLmNvbXBvc2l0b3IuZ2V0VGltZSgpICogMC4wMDE7XG4gICAgZ2xvYmFsVW5pZm9ybXMudmFsdWVzWzZdID0gcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybTtcblxuICAgIHRoaXMucHJvZ3JhbS5zZXRVbmlmb3JtcyhnbG9iYWxVbmlmb3Jtcy5rZXlzLCBnbG9iYWxVbmlmb3Jtcy52YWx1ZXMpO1xufTtcblxuLyoqXG4gKiBMb2FkcyB0aGUgYnVmZmVycyBhbmQgaXNzdWVzIHRoZSBkcmF3IGNvbW1hbmQgZm9yIGEgZ2VvbWV0cnkuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2ZXJ0ZXhCdWZmZXJzIEFsbCBidWZmZXJzIHVzZWQgdG8gZHJhdyB0aGUgZ2VvbWV0cnkuXG4gKiBAcGFyYW0ge051bWJlcn0gbW9kZSBFbnVtZXJhdG9yIGRlZmluaW5nIHdoYXQgcHJpbWl0aXZlIHRvIGRyYXdcbiAqIEBwYXJhbSB7TnVtYmVyfSBpZCBJRCBvZiBnZW9tZXRyeSBiZWluZyBkcmF3bi5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5kcmF3QnVmZmVycyA9IGZ1bmN0aW9uIGRyYXdCdWZmZXJzKHZlcnRleEJ1ZmZlcnMsIG1vZGUsIGlkKSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICB2YXIgbGVuZ3RoID0gMDtcbiAgICB2YXIgYXR0cmlidXRlO1xuICAgIHZhciBsb2NhdGlvbjtcbiAgICB2YXIgc3BhY2luZztcbiAgICB2YXIgb2Zmc2V0O1xuICAgIHZhciBidWZmZXI7XG4gICAgdmFyIGl0ZXI7XG4gICAgdmFyIGo7XG4gICAgdmFyIGk7XG5cbiAgICBpdGVyID0gdmVydGV4QnVmZmVycy5rZXlzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgaXRlcjsgaSsrKSB7XG4gICAgICAgIGF0dHJpYnV0ZSA9IHZlcnRleEJ1ZmZlcnMua2V5c1tpXTtcblxuICAgICAgICAvLyBEbyBub3Qgc2V0IHZlcnRleEF0dHJpYlBvaW50ZXIgaWYgaW5kZXggYnVmZmVyLlxuXG4gICAgICAgIGlmIChhdHRyaWJ1dGUgPT09ICdpbmRpY2VzJykge1xuICAgICAgICAgICAgaiA9IGk7IGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmV0cmVpdmUgdGhlIGF0dHJpYnV0ZSBsb2NhdGlvbiBhbmQgbWFrZSBzdXJlIGl0IGlzIGVuYWJsZWQuXG5cbiAgICAgICAgbG9jYXRpb24gPSB0aGlzLnByb2dyYW0uYXR0cmlidXRlTG9jYXRpb25zW2F0dHJpYnV0ZV07XG5cbiAgICAgICAgaWYgKGxvY2F0aW9uID09PSAtMSkgY29udGludWU7XG4gICAgICAgIGlmIChsb2NhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsb2NhdGlvbiA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHRoaXMucHJvZ3JhbS5wcm9ncmFtLCBhdHRyaWJ1dGUpO1xuICAgICAgICAgICAgdGhpcy5wcm9ncmFtLmF0dHJpYnV0ZUxvY2F0aW9uc1thdHRyaWJ1dGVdID0gbG9jYXRpb247XG4gICAgICAgICAgICBpZiAobG9jYXRpb24gPT09IC0xKSBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5zdGF0ZS5lbmFibGVkQXR0cmlidXRlc1thdHRyaWJ1dGVdKSB7XG4gICAgICAgICAgICBnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShsb2NhdGlvbik7XG4gICAgICAgICAgICB0aGlzLnN0YXRlLmVuYWJsZWRBdHRyaWJ1dGVzW2F0dHJpYnV0ZV0gPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZS5lbmFibGVkQXR0cmlidXRlc0tleXMucHVzaChhdHRyaWJ1dGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmV0cmVpdmUgYnVmZmVyIGluZm9ybWF0aW9uIHVzZWQgdG8gc2V0IGF0dHJpYnV0ZSBwb2ludGVyLlxuXG4gICAgICAgIGJ1ZmZlciA9IHZlcnRleEJ1ZmZlcnMudmFsdWVzW2ldO1xuICAgICAgICBzcGFjaW5nID0gdmVydGV4QnVmZmVycy5zcGFjaW5nW2ldO1xuICAgICAgICBvZmZzZXQgPSB2ZXJ0ZXhCdWZmZXJzLm9mZnNldFtpXTtcbiAgICAgICAgbGVuZ3RoID0gdmVydGV4QnVmZmVycy5sZW5ndGhbaV07XG5cbiAgICAgICAgLy8gU2tpcCBiaW5kQnVmZmVyIGlmIGJ1ZmZlciBpcyBjdXJyZW50bHkgYm91bmQuXG5cbiAgICAgICAgaWYgKHRoaXMuc3RhdGUuYm91bmRBcnJheUJ1ZmZlciAhPT0gYnVmZmVyKSB7XG4gICAgICAgICAgICBnbC5iaW5kQnVmZmVyKGJ1ZmZlci50YXJnZXQsIGJ1ZmZlci5idWZmZXIpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZS5ib3VuZEFycmF5QnVmZmVyID0gYnVmZmVyO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuc3RhdGUubGFzdERyYXduICE9PSBpZCkge1xuICAgICAgICAgICAgZ2wudmVydGV4QXR0cmliUG9pbnRlcihsb2NhdGlvbiwgc3BhY2luZywgZ2wuRkxPQVQsIGdsLkZBTFNFLCAwLCA0ICogb2Zmc2V0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIERpc2FibGUgYW55IGF0dHJpYnV0ZXMgdGhhdCBub3QgY3VycmVudGx5IGJlaW5nIHVzZWQuXG5cbiAgICB2YXIgbGVuID0gdGhpcy5zdGF0ZS5lbmFibGVkQXR0cmlidXRlc0tleXMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIga2V5ID0gdGhpcy5zdGF0ZS5lbmFibGVkQXR0cmlidXRlc0tleXNbaV07XG4gICAgICAgIGlmICh0aGlzLnN0YXRlLmVuYWJsZWRBdHRyaWJ1dGVzW2tleV0gJiYgdmVydGV4QnVmZmVycy5rZXlzLmluZGV4T2Yoa2V5KSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGdsLmRpc2FibGVWZXJ0ZXhBdHRyaWJBcnJheSh0aGlzLnByb2dyYW0uYXR0cmlidXRlTG9jYXRpb25zW2tleV0pO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZS5lbmFibGVkQXR0cmlidXRlc1trZXldID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobGVuZ3RoKSB7XG5cbiAgICAgICAgLy8gSWYgaW5kZXggYnVmZmVyLCB1c2UgZHJhd0VsZW1lbnRzLlxuXG4gICAgICAgIGlmIChqICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGJ1ZmZlciA9IHZlcnRleEJ1ZmZlcnMudmFsdWVzW2pdO1xuICAgICAgICAgICAgb2Zmc2V0ID0gdmVydGV4QnVmZmVycy5vZmZzZXRbal07XG4gICAgICAgICAgICBzcGFjaW5nID0gdmVydGV4QnVmZmVycy5zcGFjaW5nW2pdO1xuICAgICAgICAgICAgbGVuZ3RoID0gdmVydGV4QnVmZmVycy5sZW5ndGhbal07XG5cbiAgICAgICAgICAgIC8vIFNraXAgYmluZEJ1ZmZlciBpZiBidWZmZXIgaXMgY3VycmVudGx5IGJvdW5kLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZS5ib3VuZEVsZW1lbnRCdWZmZXIgIT09IGJ1ZmZlcikge1xuICAgICAgICAgICAgICAgIGdsLmJpbmRCdWZmZXIoYnVmZmVyLnRhcmdldCwgYnVmZmVyLmJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZS5ib3VuZEVsZW1lbnRCdWZmZXIgPSBidWZmZXI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGdsLmRyYXdFbGVtZW50cyhnbFttb2RlXSwgbGVuZ3RoLCBnbC5VTlNJR05FRF9TSE9SVCwgMiAqIG9mZnNldCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBnbC5kcmF3QXJyYXlzKGdsW21vZGVdLCAwLCBsZW5ndGgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5zdGF0ZS5sYXN0RHJhd24gPSBpZDtcbn07XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgd2lkdGggYW5kIGhlaWdodCBvZiBwYXJlbnQgY2FudmFzLCBzZXRzIHRoZSB2aWV3cG9ydCBzaXplIG9uXG4gKiB0aGUgV2ViR0wgY29udGV4dCBhbmQgdXBkYXRlcyB0aGUgcmVzb2x1dGlvbiB1bmlmb3JtIGZvciB0aGUgc2hhZGVyIHByb2dyYW0uXG4gKiBTaXplIGlzIHJldHJlaXZlZCBmcm9tIHRoZSBjb250YWluZXIgb2JqZWN0IG9mIHRoZSByZW5kZXJlci5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gc2l6ZSB3aWR0aCwgaGVpZ2h0IGFuZCBkZXB0aCBvZiBjYW52YXNcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS51cGRhdGVTaXplID0gZnVuY3Rpb24gdXBkYXRlU2l6ZShzaXplKSB7XG4gICAgaWYgKHNpemUpIHtcbiAgICAgICAgdGhpcy5jYWNoZWRTaXplWzBdID0gc2l6ZVswXTtcbiAgICAgICAgdGhpcy5jYWNoZWRTaXplWzFdID0gc2l6ZVsxXTtcbiAgICAgICAgdGhpcy5jYWNoZWRTaXplWzJdID0gKHNpemVbMF0gPiBzaXplWzFdKSA/IHNpemVbMF0gOiBzaXplWzFdO1xuICAgIH1cblxuICAgIHRoaXMuZ2wudmlld3BvcnQoMCwgMCwgdGhpcy5jYWNoZWRTaXplWzBdLCB0aGlzLmNhY2hlZFNpemVbMV0pO1xuXG4gICAgdGhpcy5yZXNvbHV0aW9uVmFsdWVzWzBdID0gdGhpcy5jYWNoZWRTaXplO1xuICAgIHRoaXMucHJvZ3JhbS5zZXRVbmlmb3Jtcyh0aGlzLnJlc29sdXRpb25OYW1lLCB0aGlzLnJlc29sdXRpb25WYWx1ZXMpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIHN0YXRlIG9mIHRoZSBXZWJHTCBkcmF3aW5nIGNvbnRleHQgYmFzZWQgb24gY3VzdG9tIHBhcmFtZXRlcnNcbiAqIGRlZmluZWQgb24gYSBtZXNoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBEcmF3IHN0YXRlIG9wdGlvbnMgdG8gYmUgc2V0IHRvIHRoZSBjb250ZXh0LlxuICogQHBhcmFtIHtNZXNofSBtZXNoIEFzc29jaWF0ZWQgTWVzaFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmhhbmRsZU9wdGlvbnMgPSBmdW5jdGlvbiBoYW5kbGVPcHRpb25zKG9wdGlvbnMsIG1lc2gpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIGlmICghb3B0aW9ucykgcmV0dXJuO1xuXG4gICAgaWYgKG9wdGlvbnMuc2lkZSA9PT0gJ2RvdWJsZScpIHtcbiAgICAgICAgdGhpcy5nbC5jdWxsRmFjZSh0aGlzLmdsLkZST05UKTtcbiAgICAgICAgdGhpcy5kcmF3QnVmZmVycyh0aGlzLmJ1ZmZlclJlZ2lzdHJ5LnJlZ2lzdHJ5W21lc2guZ2VvbWV0cnldLCBtZXNoLmRyYXdUeXBlLCBtZXNoLmdlb21ldHJ5KTtcbiAgICAgICAgdGhpcy5nbC5jdWxsRmFjZSh0aGlzLmdsLkJBQ0spO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmJsZW5kaW5nKSBnbC5ibGVuZEZ1bmMoZ2wuU1JDX0FMUEhBLCBnbC5PTkUpO1xuICAgIGlmIChvcHRpb25zLnNpZGUgPT09ICdiYWNrJykgZ2wuY3VsbEZhY2UoZ2wuRlJPTlQpO1xufTtcblxuLyoqXG4gKiBSZXNldHMgdGhlIHN0YXRlIG9mIHRoZSBXZWJHTCBkcmF3aW5nIGNvbnRleHQgdG8gZGVmYXVsdCB2YWx1ZXMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIERyYXcgc3RhdGUgb3B0aW9ucyB0byBiZSBzZXQgdG8gdGhlIGNvbnRleHQuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUucmVzZXRPcHRpb25zID0gZnVuY3Rpb24gcmVzZXRPcHRpb25zKG9wdGlvbnMpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIGlmICghb3B0aW9ucykgcmV0dXJuO1xuICAgIGlmIChvcHRpb25zLmJsZW5kaW5nKSBnbC5ibGVuZEZ1bmMoZ2wuU1JDX0FMUEhBLCBnbC5PTkVfTUlOVVNfU1JDX0FMUEhBKTtcbiAgICBpZiAob3B0aW9ucy5zaWRlID09PSAnYmFjaycpIGdsLmN1bGxGYWNlKGdsLkJBQ0spO1xufTtcblxuV2ViR0xSZW5kZXJlci5ERUZBVUxUX1NUWUxFUyA9IHtcbiAgICBwb2ludGVyRXZlbnRzOiAnbm9uZScsXG4gICAgcG9zaXRpb246ICdhYnNvbHV0ZScsXG4gICAgekluZGV4OiAxLFxuICAgIHRvcDogJzBweCcsXG4gICAgbGVmdDogJzBweCdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gV2ViR0xSZW5kZXJlcjtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciB0eXBlcyA9IHtcbiAgICAxOiAnZmxvYXQgJyxcbiAgICAyOiAndmVjMiAnLFxuICAgIDM6ICd2ZWMzICcsXG4gICAgNDogJ3ZlYzQgJ1xufTtcblxuLyoqXG4gKiBUcmF2ZXJzZXMgbWF0ZXJpYWwgdG8gY3JlYXRlIGEgc3RyaW5nIG9mIGdsc2wgY29kZSB0byBiZSBhcHBsaWVkIGluXG4gKiB0aGUgdmVydGV4IG9yIGZyYWdtZW50IHNoYWRlci5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJvdGVjdGVkXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG1hdGVyaWFsIE1hdGVyaWFsIHRvIGJlIGNvbXBpbGVkLlxuICogQHBhcmFtIHtOdW1iZXJ9IHRleHR1cmVTbG90IE5leHQgYXZhaWxhYmxlIHRleHR1cmUgc2xvdCBmb3IgTWVzaC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5mdW5jdGlvbiBjb21waWxlTWF0ZXJpYWwobWF0ZXJpYWwsIHRleHR1cmVTbG90KSB7XG4gICAgdmFyIGdsc2wgPSAnJztcbiAgICB2YXIgdW5pZm9ybXMgPSB7fTtcbiAgICB2YXIgdmFyeWluZ3MgPSB7fTtcbiAgICB2YXIgYXR0cmlidXRlcyA9IHt9O1xuICAgIHZhciBkZWZpbmVzID0gW107XG4gICAgdmFyIHRleHR1cmVzID0gW107XG5cbiAgICBfdHJhdmVyc2UobWF0ZXJpYWwsIGZ1bmN0aW9uIChub2RlLCBkZXB0aCkge1xuICAgICAgICBpZiAoISBub2RlLmNodW5rKSByZXR1cm47XG5cbiAgICAgICAgdmFyIHR5cGUgPSB0eXBlc1tfZ2V0T3V0cHV0TGVuZ3RoKG5vZGUpXTtcbiAgICAgICAgdmFyIGxhYmVsID0gX21ha2VMYWJlbChub2RlKTtcbiAgICAgICAgdmFyIG91dHB1dCA9IF9wcm9jZXNzR0xTTChub2RlLmNodW5rLmdsc2wsIG5vZGUuaW5wdXRzLCB0ZXh0dXJlcy5sZW5ndGggKyB0ZXh0dXJlU2xvdCk7XG5cbiAgICAgICAgZ2xzbCArPSB0eXBlICsgbGFiZWwgKyAnID0gJyArIG91dHB1dCArICdcXG4gJztcblxuICAgICAgICBpZiAobm9kZS51bmlmb3JtcykgX2V4dGVuZCh1bmlmb3Jtcywgbm9kZS51bmlmb3Jtcyk7XG4gICAgICAgIGlmIChub2RlLnZhcnlpbmdzKSBfZXh0ZW5kKHZhcnlpbmdzLCBub2RlLnZhcnlpbmdzKTtcbiAgICAgICAgaWYgKG5vZGUuYXR0cmlidXRlcykgX2V4dGVuZChhdHRyaWJ1dGVzLCBub2RlLmF0dHJpYnV0ZXMpO1xuICAgICAgICBpZiAobm9kZS5jaHVuay5kZWZpbmVzKSBkZWZpbmVzLnB1c2gobm9kZS5jaHVuay5kZWZpbmVzKTtcbiAgICAgICAgaWYgKG5vZGUudGV4dHVyZSkgdGV4dHVyZXMucHVzaChub2RlLnRleHR1cmUpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgX2lkOiBtYXRlcmlhbC5faWQsXG4gICAgICAgIGdsc2w6IGdsc2wgKyAncmV0dXJuICcgKyBfbWFrZUxhYmVsKG1hdGVyaWFsKSArICc7JyxcbiAgICAgICAgZGVmaW5lczogZGVmaW5lcy5qb2luKCdcXG4nKSxcbiAgICAgICAgdW5pZm9ybXM6IHVuaWZvcm1zLFxuICAgICAgICB2YXJ5aW5nczogdmFyeWluZ3MsXG4gICAgICAgIGF0dHJpYnV0ZXM6IGF0dHJpYnV0ZXMsXG4gICAgICAgIHRleHR1cmVzOiB0ZXh0dXJlc1xuICAgIH07XG59XG5cbi8vIFJlY3Vyc2l2ZWx5IGl0ZXJhdGVzIG92ZXIgYSBtYXRlcmlhbCdzIGlucHV0cywgaW52b2tpbmcgYSBnaXZlbiBjYWxsYmFja1xuLy8gd2l0aCB0aGUgY3VycmVudCBtYXRlcmlhbFxuZnVuY3Rpb24gX3RyYXZlcnNlKG1hdGVyaWFsLCBjYWxsYmFjaykge1xuXHR2YXIgaW5wdXRzID0gbWF0ZXJpYWwuaW5wdXRzO1xuICAgIHZhciBsZW4gPSBpbnB1dHMgJiYgaW5wdXRzLmxlbmd0aDtcbiAgICB2YXIgaWR4ID0gLTE7XG5cbiAgICB3aGlsZSAoKytpZHggPCBsZW4pIF90cmF2ZXJzZShpbnB1dHNbaWR4XSwgY2FsbGJhY2spO1xuXG4gICAgY2FsbGJhY2sobWF0ZXJpYWwpO1xuXG4gICAgcmV0dXJuIG1hdGVyaWFsO1xufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdXNlZCB0byBpbmZlciBsZW5ndGggb2YgdGhlIG91dHB1dFxuLy8gZnJvbSBhIGdpdmVuIG1hdGVyaWFsIG5vZGUuXG5mdW5jdGlvbiBfZ2V0T3V0cHV0TGVuZ3RoKG5vZGUpIHtcblxuICAgIC8vIEhhbmRsZSBjb25zdGFudCB2YWx1ZXNcblxuICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ251bWJlcicpIHJldHVybiAxO1xuICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpKSByZXR1cm4gbm9kZS5sZW5ndGg7XG5cbiAgICAvLyBIYW5kbGUgbWF0ZXJpYWxzXG5cbiAgICB2YXIgb3V0cHV0ID0gbm9kZS5jaHVuay5vdXRwdXQ7XG4gICAgaWYgKHR5cGVvZiBvdXRwdXQgPT09ICdudW1iZXInKSByZXR1cm4gb3V0cHV0O1xuXG4gICAgLy8gSGFuZGxlIHBvbHltb3JwaGljIG91dHB1dFxuXG4gICAgdmFyIGtleSA9IG5vZGUuaW5wdXRzLm1hcChmdW5jdGlvbiByZWN1cnNlKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRPdXRwdXRMZW5ndGgobm9kZSk7XG4gICAgfSkuam9pbignLCcpO1xuXG4gICAgcmV0dXJuIG91dHB1dFtrZXldO1xufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gcnVuIHJlcGxhY2UgaW5wdXRzIGFuZCB0ZXh0dXJlIHRhZ3Mgd2l0aFxuLy8gY29ycmVjdCBnbHNsLlxuZnVuY3Rpb24gX3Byb2Nlc3NHTFNMKHN0ciwgaW5wdXRzLCB0ZXh0dXJlU2xvdCkge1xuICAgIHJldHVybiBzdHJcbiAgICAgICAgLnJlcGxhY2UoLyVcXGQvZywgZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgIHJldHVybiBfbWFrZUxhYmVsKGlucHV0c1tzWzFdLTFdKTtcbiAgICAgICAgfSlcbiAgICAgICAgLnJlcGxhY2UoL1xcJFRFWFRVUkUvLCAndV90ZXh0dXJlc1snICsgdGV4dHVyZVNsb3QgKyAnXScpO1xufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdXNlZCB0byBjcmVhdGUgZ2xzbCBkZWZpbml0aW9uIG9mIHRoZVxuLy8gaW5wdXQgbWF0ZXJpYWwgbm9kZS5cbmZ1bmN0aW9uIF9tYWtlTGFiZWwgKG4pIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShuKSkgcmV0dXJuIF9hcnJheVRvVmVjKG4pO1xuICAgIGlmICh0eXBlb2YgbiA9PT0gJ29iamVjdCcpIHJldHVybiAnZmFfJyArIChuLl9pZCk7XG4gICAgZWxzZSByZXR1cm4gbi50b0ZpeGVkKDYpO1xufVxuXG4vLyBIZWxwZXIgdG8gY29weSB0aGUgcHJvcGVydGllcyBvZiBhbiBvYmplY3Qgb250byBhbm90aGVyIG9iamVjdC5cbmZ1bmN0aW9uIF9leHRlbmQgKGEsIGIpIHtcblx0Zm9yICh2YXIgayBpbiBiKSBhW2tdID0gYltrXTtcbn1cblxuLy8gSGVscGVyIHRvIGNyZWF0ZSBnbHNsIHZlY3RvciByZXByZXNlbnRhdGlvbiBvZiBhIGphdmFzY3JpcHQgYXJyYXkuXG5mdW5jdGlvbiBfYXJyYXlUb1ZlYyhhcnJheSkge1xuICAgIHZhciBsZW4gPSBhcnJheS5sZW5ndGg7XG4gICAgcmV0dXJuICd2ZWMnICsgbGVuICsgJygnICsgYXJyYXkuam9pbignLCcpICArICcpJztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjb21waWxlTWF0ZXJpYWw7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8vIEdlbmVyYXRlcyBhIGNoZWNrZXJib2FyZCBwYXR0ZXJuIHRvIGJlIHVzZWQgYXMgYSBwbGFjZWhvbGRlciB0ZXh0dXJlIHdoaWxlIGFuXG4vLyBpbWFnZSBsb2FkcyBvdmVyIHRoZSBuZXR3b3JrLlxuZnVuY3Rpb24gY3JlYXRlQ2hlY2tlckJvYXJkKCkge1xuICAgIHZhciBjb250ZXh0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJykuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjb250ZXh0LmNhbnZhcy53aWR0aCA9IGNvbnRleHQuY2FudmFzLmhlaWdodCA9IDEyODtcbiAgICBmb3IgKHZhciB5ID0gMDsgeSA8IGNvbnRleHQuY2FudmFzLmhlaWdodDsgeSArPSAxNikge1xuICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IGNvbnRleHQuY2FudmFzLndpZHRoOyB4ICs9IDE2KSB7XG4gICAgICAgICAgICBjb250ZXh0LmZpbGxTdHlsZSA9ICh4IF4geSkgJiAxNiA/ICcjRkZGJyA6ICcjREREJztcbiAgICAgICAgICAgIGNvbnRleHQuZmlsbFJlY3QoeCwgeSwgMTYsIDE2KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjb250ZXh0LmNhbnZhcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVDaGVja2VyQm9hcmQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmFkaXhCaXRzID0gMTEsXG4gICAgbWF4UmFkaXggPSAxIDw8IChyYWRpeEJpdHMpLFxuICAgIHJhZGl4TWFzayA9IG1heFJhZGl4IC0gMSxcbiAgICBidWNrZXRzID0gbmV3IEFycmF5KG1heFJhZGl4ICogTWF0aC5jZWlsKDY0IC8gcmFkaXhCaXRzKSksXG4gICAgbXNiTWFzayA9IDEgPDwgKCgzMiAtIDEpICUgcmFkaXhCaXRzKSxcbiAgICBsYXN0TWFzayA9IChtc2JNYXNrIDw8IDEpIC0gMSxcbiAgICBwYXNzQ291bnQgPSAoKDMyIC8gcmFkaXhCaXRzKSArIDAuOTk5OTk5OTk5OTk5OTk5KSB8IDAsXG4gICAgbWF4T2Zmc2V0ID0gbWF4UmFkaXggKiAocGFzc0NvdW50IC0gMSksXG4gICAgbm9ybWFsaXplciA9IE1hdGgucG93KDIwLCA2KTtcblxudmFyIGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcig0KTtcbnZhciBmbG9hdFZpZXcgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlciwgMCwgMSk7XG52YXIgaW50VmlldyA9IG5ldyBJbnQzMkFycmF5KGJ1ZmZlciwgMCwgMSk7XG5cbi8vIGNvbXBhcmF0b3IgcHVsbHMgcmVsZXZhbnQgc29ydGluZyBrZXlzIG91dCBvZiBtZXNoXG5mdW5jdGlvbiBjb21wKGxpc3QsIHJlZ2lzdHJ5LCBpKSB7XG4gICAgdmFyIGtleSA9IGxpc3RbaV07XG4gICAgdmFyIGl0ZW0gPSByZWdpc3RyeVtrZXldO1xuICAgIHJldHVybiAoaXRlbS5kZXB0aCA/IGl0ZW0uZGVwdGggOiByZWdpc3RyeVtrZXldLnVuaWZvcm1WYWx1ZXNbMV1bMTRdKSArIG5vcm1hbGl6ZXI7XG59XG5cbi8vbXV0YXRvciBmdW5jdGlvbiByZWNvcmRzIG1lc2gncyBwbGFjZSBpbiBwcmV2aW91cyBwYXNzXG5mdW5jdGlvbiBtdXRhdG9yKGxpc3QsIHJlZ2lzdHJ5LCBpLCB2YWx1ZSkge1xuICAgIHZhciBrZXkgPSBsaXN0W2ldO1xuICAgIHJlZ2lzdHJ5W2tleV0uZGVwdGggPSBpbnRUb0Zsb2F0KHZhbHVlKSAtIG5vcm1hbGl6ZXI7XG4gICAgcmV0dXJuIGtleTtcbn1cblxuLy9jbGVhbiBmdW5jdGlvbiByZW1vdmVzIG11dGF0b3IgZnVuY3Rpb24ncyByZWNvcmRcbmZ1bmN0aW9uIGNsZWFuKGxpc3QsIHJlZ2lzdHJ5LCBpKSB7XG4gICAgcmVnaXN0cnlbbGlzdFtpXV0uZGVwdGggPSBudWxsO1xufVxuXG4vL2NvbnZlcnRzIGEgamF2YXNjcmlwdCBmbG9hdCB0byBhIDMyYml0IGludGVnZXIgdXNpbmcgYW4gYXJyYXkgYnVmZmVyXG4vL29mIHNpemUgb25lXG5mdW5jdGlvbiBmbG9hdFRvSW50KGspIHtcbiAgICBmbG9hdFZpZXdbMF0gPSBrO1xuICAgIHJldHVybiBpbnRWaWV3WzBdO1xufVxuLy9jb252ZXJ0cyBhIDMyIGJpdCBpbnRlZ2VyIHRvIGEgcmVndWxhciBqYXZhc2NyaXB0IGZsb2F0IHVzaW5nIGFuIGFycmF5IGJ1ZmZlclxuLy9vZiBzaXplIG9uZVxuZnVuY3Rpb24gaW50VG9GbG9hdChrKSB7XG4gICAgaW50Vmlld1swXSA9IGs7XG4gICAgcmV0dXJuIGZsb2F0Vmlld1swXTtcbn1cblxuLy9zb3J0cyBhIGxpc3Qgb2YgbWVzaCBJRHMgYWNjb3JkaW5nIHRvIHRoZWlyIHotZGVwdGhcbmZ1bmN0aW9uIHJhZGl4U29ydChsaXN0LCByZWdpc3RyeSkge1xuICAgIHZhciBwYXNzID0gMDtcbiAgICB2YXIgb3V0ID0gW107XG5cbiAgICB2YXIgaSwgaiwgaywgbiwgZGl2LCBvZmZzZXQsIHN3YXAsIGlkLCBzdW0sIHRzdW0sIHNpemU7XG5cbiAgICBwYXNzQ291bnQgPSAoKDMyIC8gcmFkaXhCaXRzKSArIDAuOTk5OTk5OTk5OTk5OTk5KSB8IDA7XG5cbiAgICBmb3IgKGkgPSAwLCBuID0gbWF4UmFkaXggKiBwYXNzQ291bnQ7IGkgPCBuOyBpKyspIGJ1Y2tldHNbaV0gPSAwO1xuXG4gICAgZm9yIChpID0gMCwgbiA9IGxpc3QubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGRpdiA9IGZsb2F0VG9JbnQoY29tcChsaXN0LCByZWdpc3RyeSwgaSkpO1xuICAgICAgICBkaXYgXj0gZGl2ID4+IDMxIHwgMHg4MDAwMDAwMDtcbiAgICAgICAgZm9yIChqID0gMCwgayA9IDA7IGogPCBtYXhPZmZzZXQ7IGogKz0gbWF4UmFkaXgsIGsgKz0gcmFkaXhCaXRzKSB7XG4gICAgICAgICAgICBidWNrZXRzW2ogKyAoZGl2ID4+PiBrICYgcmFkaXhNYXNrKV0rKztcbiAgICAgICAgfVxuICAgICAgICBidWNrZXRzW2ogKyAoZGl2ID4+PiBrICYgbGFzdE1hc2spXSsrO1xuICAgIH1cblxuICAgIGZvciAoaiA9IDA7IGogPD0gbWF4T2Zmc2V0OyBqICs9IG1heFJhZGl4KSB7XG4gICAgICAgIGZvciAoaWQgPSBqLCBzdW0gPSAwOyBpZCA8IGogKyBtYXhSYWRpeDsgaWQrKykge1xuICAgICAgICAgICAgdHN1bSA9IGJ1Y2tldHNbaWRdICsgc3VtO1xuICAgICAgICAgICAgYnVja2V0c1tpZF0gPSBzdW0gLSAxO1xuICAgICAgICAgICAgc3VtID0gdHN1bTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoLS1wYXNzQ291bnQpIHtcbiAgICAgICAgZm9yIChpID0gMCwgbiA9IGxpc3QubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBkaXYgPSBmbG9hdFRvSW50KGNvbXAobGlzdCwgcmVnaXN0cnksIGkpKTtcbiAgICAgICAgICAgIG91dFsrK2J1Y2tldHNbZGl2ICYgcmFkaXhNYXNrXV0gPSBtdXRhdG9yKGxpc3QsIHJlZ2lzdHJ5LCBpLCBkaXYgXj0gZGl2ID4+IDMxIHwgMHg4MDAwMDAwMCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3YXAgPSBvdXQ7XG4gICAgICAgIG91dCA9IGxpc3Q7XG4gICAgICAgIGxpc3QgPSBzd2FwO1xuICAgICAgICB3aGlsZSAoKytwYXNzIDwgcGFzc0NvdW50KSB7XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBuID0gbGlzdC5sZW5ndGgsIG9mZnNldCA9IHBhc3MgKiBtYXhSYWRpeCwgc2l6ZSA9IHBhc3MgKiByYWRpeEJpdHM7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBkaXYgPSBmbG9hdFRvSW50KGNvbXAobGlzdCwgcmVnaXN0cnksIGkpKTtcbiAgICAgICAgICAgICAgICBvdXRbKytidWNrZXRzW29mZnNldCArIChkaXYgPj4+IHNpemUgJiByYWRpeE1hc2spXV0gPSBsaXN0W2ldO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzd2FwID0gb3V0O1xuICAgICAgICAgICAgb3V0ID0gbGlzdDtcbiAgICAgICAgICAgIGxpc3QgPSBzd2FwO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChpID0gMCwgbiA9IGxpc3QubGVuZ3RoLCBvZmZzZXQgPSBwYXNzICogbWF4UmFkaXgsIHNpemUgPSBwYXNzICogcmFkaXhCaXRzOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGRpdiA9IGZsb2F0VG9JbnQoY29tcChsaXN0LCByZWdpc3RyeSwgaSkpO1xuICAgICAgICBvdXRbKytidWNrZXRzW29mZnNldCArIChkaXYgPj4+IHNpemUgJiBsYXN0TWFzayldXSA9IG11dGF0b3IobGlzdCwgcmVnaXN0cnksIGksIGRpdiBeICh+ZGl2ID4+IDMxIHwgMHg4MDAwMDAwMCkpO1xuICAgICAgICBjbGVhbihsaXN0LCByZWdpc3RyeSwgaSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSByYWRpeFNvcnQ7XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBnbHNsaWZ5ID0gcmVxdWlyZShcImdsc2xpZnlcIik7XG52YXIgc2hhZGVycyA9IHJlcXVpcmUoXCJnbHNsaWZ5L3NpbXBsZS1hZGFwdGVyLmpzXCIpKFwiXFxuI2RlZmluZSBHTFNMSUZZIDFcXG5cXG5tYXQzIGFfeF9nZXROb3JtYWxNYXRyaXgoaW4gbWF0NCB0KSB7XFxuICBtYXQzIG1hdE5vcm07XFxuICBtYXQ0IGEgPSB0O1xcbiAgZmxvYXQgYTAwID0gYVswXVswXSwgYTAxID0gYVswXVsxXSwgYTAyID0gYVswXVsyXSwgYTAzID0gYVswXVszXSwgYTEwID0gYVsxXVswXSwgYTExID0gYVsxXVsxXSwgYTEyID0gYVsxXVsyXSwgYTEzID0gYVsxXVszXSwgYTIwID0gYVsyXVswXSwgYTIxID0gYVsyXVsxXSwgYTIyID0gYVsyXVsyXSwgYTIzID0gYVsyXVszXSwgYTMwID0gYVszXVswXSwgYTMxID0gYVszXVsxXSwgYTMyID0gYVszXVsyXSwgYTMzID0gYVszXVszXSwgYjAwID0gYTAwICogYTExIC0gYTAxICogYTEwLCBiMDEgPSBhMDAgKiBhMTIgLSBhMDIgKiBhMTAsIGIwMiA9IGEwMCAqIGExMyAtIGEwMyAqIGExMCwgYjAzID0gYTAxICogYTEyIC0gYTAyICogYTExLCBiMDQgPSBhMDEgKiBhMTMgLSBhMDMgKiBhMTEsIGIwNSA9IGEwMiAqIGExMyAtIGEwMyAqIGExMiwgYjA2ID0gYTIwICogYTMxIC0gYTIxICogYTMwLCBiMDcgPSBhMjAgKiBhMzIgLSBhMjIgKiBhMzAsIGIwOCA9IGEyMCAqIGEzMyAtIGEyMyAqIGEzMCwgYjA5ID0gYTIxICogYTMyIC0gYTIyICogYTMxLCBiMTAgPSBhMjEgKiBhMzMgLSBhMjMgKiBhMzEsIGIxMSA9IGEyMiAqIGEzMyAtIGEyMyAqIGEzMiwgZGV0ID0gYjAwICogYjExIC0gYjAxICogYjEwICsgYjAyICogYjA5ICsgYjAzICogYjA4IC0gYjA0ICogYjA3ICsgYjA1ICogYjA2O1xcbiAgZGV0ID0gMS4wIC8gZGV0O1xcbiAgbWF0Tm9ybVswXVswXSA9IChhMTEgKiBiMTEgLSBhMTIgKiBiMTAgKyBhMTMgKiBiMDkpICogZGV0O1xcbiAgbWF0Tm9ybVswXVsxXSA9IChhMTIgKiBiMDggLSBhMTAgKiBiMTEgLSBhMTMgKiBiMDcpICogZGV0O1xcbiAgbWF0Tm9ybVswXVsyXSA9IChhMTAgKiBiMTAgLSBhMTEgKiBiMDggKyBhMTMgKiBiMDYpICogZGV0O1xcbiAgbWF0Tm9ybVsxXVswXSA9IChhMDIgKiBiMTAgLSBhMDEgKiBiMTEgLSBhMDMgKiBiMDkpICogZGV0O1xcbiAgbWF0Tm9ybVsxXVsxXSA9IChhMDAgKiBiMTEgLSBhMDIgKiBiMDggKyBhMDMgKiBiMDcpICogZGV0O1xcbiAgbWF0Tm9ybVsxXVsyXSA9IChhMDEgKiBiMDggLSBhMDAgKiBiMTAgLSBhMDMgKiBiMDYpICogZGV0O1xcbiAgbWF0Tm9ybVsyXVswXSA9IChhMzEgKiBiMDUgLSBhMzIgKiBiMDQgKyBhMzMgKiBiMDMpICogZGV0O1xcbiAgbWF0Tm9ybVsyXVsxXSA9IChhMzIgKiBiMDIgLSBhMzAgKiBiMDUgLSBhMzMgKiBiMDEpICogZGV0O1xcbiAgbWF0Tm9ybVsyXVsyXSA9IChhMzAgKiBiMDQgLSBhMzEgKiBiMDIgKyBhMzMgKiBiMDApICogZGV0O1xcbiAgcmV0dXJuIG1hdE5vcm07XFxufVxcbmZsb2F0IGJfeF9pbnZlcnNlKGZsb2F0IG0pIHtcXG4gIHJldHVybiAxLjAgLyBtO1xcbn1cXG5tYXQyIGJfeF9pbnZlcnNlKG1hdDIgbSkge1xcbiAgcmV0dXJuIG1hdDIobVsxXVsxXSwgLW1bMF1bMV0sIC1tWzFdWzBdLCBtWzBdWzBdKSAvIChtWzBdWzBdICogbVsxXVsxXSAtIG1bMF1bMV0gKiBtWzFdWzBdKTtcXG59XFxubWF0MyBiX3hfaW52ZXJzZShtYXQzIG0pIHtcXG4gIGZsb2F0IGEwMCA9IG1bMF1bMF0sIGEwMSA9IG1bMF1bMV0sIGEwMiA9IG1bMF1bMl07XFxuICBmbG9hdCBhMTAgPSBtWzFdWzBdLCBhMTEgPSBtWzFdWzFdLCBhMTIgPSBtWzFdWzJdO1xcbiAgZmxvYXQgYTIwID0gbVsyXVswXSwgYTIxID0gbVsyXVsxXSwgYTIyID0gbVsyXVsyXTtcXG4gIGZsb2F0IGIwMSA9IGEyMiAqIGExMSAtIGExMiAqIGEyMTtcXG4gIGZsb2F0IGIxMSA9IC1hMjIgKiBhMTAgKyBhMTIgKiBhMjA7XFxuICBmbG9hdCBiMjEgPSBhMjEgKiBhMTAgLSBhMTEgKiBhMjA7XFxuICBmbG9hdCBkZXQgPSBhMDAgKiBiMDEgKyBhMDEgKiBiMTEgKyBhMDIgKiBiMjE7XFxuICByZXR1cm4gbWF0MyhiMDEsICgtYTIyICogYTAxICsgYTAyICogYTIxKSwgKGExMiAqIGEwMSAtIGEwMiAqIGExMSksIGIxMSwgKGEyMiAqIGEwMCAtIGEwMiAqIGEyMCksICgtYTEyICogYTAwICsgYTAyICogYTEwKSwgYjIxLCAoLWEyMSAqIGEwMCArIGEwMSAqIGEyMCksIChhMTEgKiBhMDAgLSBhMDEgKiBhMTApKSAvIGRldDtcXG59XFxubWF0NCBiX3hfaW52ZXJzZShtYXQ0IG0pIHtcXG4gIGZsb2F0IGEwMCA9IG1bMF1bMF0sIGEwMSA9IG1bMF1bMV0sIGEwMiA9IG1bMF1bMl0sIGEwMyA9IG1bMF1bM10sIGExMCA9IG1bMV1bMF0sIGExMSA9IG1bMV1bMV0sIGExMiA9IG1bMV1bMl0sIGExMyA9IG1bMV1bM10sIGEyMCA9IG1bMl1bMF0sIGEyMSA9IG1bMl1bMV0sIGEyMiA9IG1bMl1bMl0sIGEyMyA9IG1bMl1bM10sIGEzMCA9IG1bM11bMF0sIGEzMSA9IG1bM11bMV0sIGEzMiA9IG1bM11bMl0sIGEzMyA9IG1bM11bM10sIGIwMCA9IGEwMCAqIGExMSAtIGEwMSAqIGExMCwgYjAxID0gYTAwICogYTEyIC0gYTAyICogYTEwLCBiMDIgPSBhMDAgKiBhMTMgLSBhMDMgKiBhMTAsIGIwMyA9IGEwMSAqIGExMiAtIGEwMiAqIGExMSwgYjA0ID0gYTAxICogYTEzIC0gYTAzICogYTExLCBiMDUgPSBhMDIgKiBhMTMgLSBhMDMgKiBhMTIsIGIwNiA9IGEyMCAqIGEzMSAtIGEyMSAqIGEzMCwgYjA3ID0gYTIwICogYTMyIC0gYTIyICogYTMwLCBiMDggPSBhMjAgKiBhMzMgLSBhMjMgKiBhMzAsIGIwOSA9IGEyMSAqIGEzMiAtIGEyMiAqIGEzMSwgYjEwID0gYTIxICogYTMzIC0gYTIzICogYTMxLCBiMTEgPSBhMjIgKiBhMzMgLSBhMjMgKiBhMzIsIGRldCA9IGIwMCAqIGIxMSAtIGIwMSAqIGIxMCArIGIwMiAqIGIwOSArIGIwMyAqIGIwOCAtIGIwNCAqIGIwNyArIGIwNSAqIGIwNjtcXG4gIHJldHVybiBtYXQ0KGExMSAqIGIxMSAtIGExMiAqIGIxMCArIGExMyAqIGIwOSwgYTAyICogYjEwIC0gYTAxICogYjExIC0gYTAzICogYjA5LCBhMzEgKiBiMDUgLSBhMzIgKiBiMDQgKyBhMzMgKiBiMDMsIGEyMiAqIGIwNCAtIGEyMSAqIGIwNSAtIGEyMyAqIGIwMywgYTEyICogYjA4IC0gYTEwICogYjExIC0gYTEzICogYjA3LCBhMDAgKiBiMTEgLSBhMDIgKiBiMDggKyBhMDMgKiBiMDcsIGEzMiAqIGIwMiAtIGEzMCAqIGIwNSAtIGEzMyAqIGIwMSwgYTIwICogYjA1IC0gYTIyICogYjAyICsgYTIzICogYjAxLCBhMTAgKiBiMTAgLSBhMTEgKiBiMDggKyBhMTMgKiBiMDYsIGEwMSAqIGIwOCAtIGEwMCAqIGIxMCAtIGEwMyAqIGIwNiwgYTMwICogYjA0IC0gYTMxICogYjAyICsgYTMzICogYjAwLCBhMjEgKiBiMDIgLSBhMjAgKiBiMDQgLSBhMjMgKiBiMDAsIGExMSAqIGIwNyAtIGExMCAqIGIwOSAtIGExMiAqIGIwNiwgYTAwICogYjA5IC0gYTAxICogYjA3ICsgYTAyICogYjA2LCBhMzEgKiBiMDEgLSBhMzAgKiBiMDMgLSBhMzIgKiBiMDAsIGEyMCAqIGIwMyAtIGEyMSAqIGIwMSArIGEyMiAqIGIwMCkgLyBkZXQ7XFxufVxcbmZsb2F0IGNfeF90cmFuc3Bvc2UoZmxvYXQgbSkge1xcbiAgcmV0dXJuIG07XFxufVxcbm1hdDIgY194X3RyYW5zcG9zZShtYXQyIG0pIHtcXG4gIHJldHVybiBtYXQyKG1bMF1bMF0sIG1bMV1bMF0sIG1bMF1bMV0sIG1bMV1bMV0pO1xcbn1cXG5tYXQzIGNfeF90cmFuc3Bvc2UobWF0MyBtKSB7XFxuICByZXR1cm4gbWF0MyhtWzBdWzBdLCBtWzFdWzBdLCBtWzJdWzBdLCBtWzBdWzFdLCBtWzFdWzFdLCBtWzJdWzFdLCBtWzBdWzJdLCBtWzFdWzJdLCBtWzJdWzJdKTtcXG59XFxubWF0NCBjX3hfdHJhbnNwb3NlKG1hdDQgbSkge1xcbiAgcmV0dXJuIG1hdDQobVswXVswXSwgbVsxXVswXSwgbVsyXVswXSwgbVszXVswXSwgbVswXVsxXSwgbVsxXVsxXSwgbVsyXVsxXSwgbVszXVsxXSwgbVswXVsyXSwgbVsxXVsyXSwgbVsyXVsyXSwgbVszXVsyXSwgbVswXVszXSwgbVsxXVszXSwgbVsyXVszXSwgbVszXVszXSk7XFxufVxcbnZlYzQgYXBwbHlUcmFuc2Zvcm0odmVjNCBwb3MpIHtcXG4gIG1hdDQgTVZNYXRyaXggPSB1X3ZpZXcgKiB1X3RyYW5zZm9ybTtcXG4gIHBvcy54ICs9IDEuMDtcXG4gIHBvcy55IC09IDEuMDtcXG4gIHBvcy54eXogKj0gdV9zaXplICogMC41O1xcbiAgcG9zLnkgKj0gLTEuMDtcXG4gIHZfcG9zaXRpb24gPSAoTVZNYXRyaXggKiBwb3MpLnh5ejtcXG4gIHZfZXllVmVjdG9yID0gKHVfcmVzb2x1dGlvbiAqIDAuNSkgLSB2X3Bvc2l0aW9uO1xcbiAgcG9zID0gdV9wZXJzcGVjdGl2ZSAqIE1WTWF0cml4ICogcG9zO1xcbiAgcmV0dXJuIHBvcztcXG59XFxuI3ZlcnRfZGVmaW5pdGlvbnNcXG5cXG52ZWMzIGNhbGN1bGF0ZU9mZnNldCh2ZWMzIElEKSB7XFxuICBcXG4gICN2ZXJ0X2FwcGxpY2F0aW9uc1xcbiAgcmV0dXJuIHZlYzMoMC4wKTtcXG59XFxudm9pZCBtYWluKCkge1xcbiAgdl90ZXh0dXJlQ29vcmRpbmF0ZSA9IGFfdGV4Q29vcmQ7XFxuICB2ZWMzIGludmVydGVkTm9ybWFscyA9IGFfbm9ybWFscyArICh1X25vcm1hbHMueCA8IDAuMCA/IGNhbGN1bGF0ZU9mZnNldCh1X25vcm1hbHMpICogMi4wIC0gMS4wIDogdmVjMygwLjApKTtcXG4gIGludmVydGVkTm9ybWFscy55ICo9IC0xLjA7XFxuICB2X25vcm1hbCA9IGNfeF90cmFuc3Bvc2UobWF0MyhiX3hfaW52ZXJzZSh1X3RyYW5zZm9ybSkpKSAqIGludmVydGVkTm9ybWFscztcXG4gIHZlYzMgb2Zmc2V0UG9zID0gYV9wb3MgKyBjYWxjdWxhdGVPZmZzZXQodV9wb3NpdGlvbk9mZnNldCk7XFxuICBnbF9Qb3NpdGlvbiA9IGFwcGx5VHJhbnNmb3JtKHZlYzQob2Zmc2V0UG9zLCAxLjApKTtcXG59XCIsIFwiXFxuI2RlZmluZSBHTFNMSUZZIDFcXG5cXG4jZmxvYXRfZGVmaW5pdGlvbnNcXG5cXG5mbG9hdCBhX3hfYXBwbHlNYXRlcmlhbChmbG9hdCBJRCkge1xcbiAgXFxuICAjZmxvYXRfYXBwbGljYXRpb25zXFxuICByZXR1cm4gMS47XFxufVxcbiN2ZWMzX2RlZmluaXRpb25zXFxuXFxudmVjMyBhX3hfYXBwbHlNYXRlcmlhbCh2ZWMzIElEKSB7XFxuICBcXG4gICN2ZWMzX2FwcGxpY2F0aW9uc1xcbiAgcmV0dXJuIHZlYzMoMCk7XFxufVxcbiN2ZWM0X2RlZmluaXRpb25zXFxuXFxudmVjNCBhX3hfYXBwbHlNYXRlcmlhbCh2ZWM0IElEKSB7XFxuICBcXG4gICN2ZWM0X2FwcGxpY2F0aW9uc1xcbiAgcmV0dXJuIHZlYzQoMCk7XFxufVxcbnZlYzQgYl94X2FwcGx5TGlnaHQoaW4gdmVjNCBiYXNlQ29sb3IsIGluIHZlYzMgbm9ybWFsLCBpbiB2ZWM0IGdsb3NzaW5lc3MpIHtcXG4gIGludCBudW1MaWdodHMgPSBpbnQodV9udW1MaWdodHMpO1xcbiAgdmVjMyBhbWJpZW50Q29sb3IgPSB1X2FtYmllbnRMaWdodCAqIGJhc2VDb2xvci5yZ2I7XFxuICB2ZWMzIGV5ZVZlY3RvciA9IG5vcm1hbGl6ZSh2X2V5ZVZlY3Rvcik7XFxuICB2ZWMzIGRpZmZ1c2UgPSB2ZWMzKDAuMCk7XFxuICBib29sIGhhc0dsb3NzaW5lc3MgPSBnbG9zc2luZXNzLmEgPiAwLjA7XFxuICBib29sIGhhc1NwZWN1bGFyQ29sb3IgPSBsZW5ndGgoZ2xvc3NpbmVzcy5yZ2IpID4gMC4wO1xcbiAgZm9yKGludCBpID0gMDsgaSA8IDQ7IGkrKykge1xcbiAgICBpZihpID49IG51bUxpZ2h0cylcXG4gICAgICBicmVhaztcXG4gICAgdmVjMyBsaWdodERpcmVjdGlvbiA9IG5vcm1hbGl6ZSh1X2xpZ2h0UG9zaXRpb25baV0ueHl6IC0gdl9wb3NpdGlvbik7XFxuICAgIGZsb2F0IGxhbWJlcnRpYW4gPSBtYXgoZG90KGxpZ2h0RGlyZWN0aW9uLCBub3JtYWwpLCAwLjApO1xcbiAgICBpZihsYW1iZXJ0aWFuID4gMC4wKSB7XFxuICAgICAgZGlmZnVzZSArPSB1X2xpZ2h0Q29sb3JbaV0ucmdiICogYmFzZUNvbG9yLnJnYiAqIGxhbWJlcnRpYW47XFxuICAgICAgaWYoaGFzR2xvc3NpbmVzcykge1xcbiAgICAgICAgdmVjMyBoYWxmVmVjdG9yID0gbm9ybWFsaXplKGxpZ2h0RGlyZWN0aW9uICsgZXllVmVjdG9yKTtcXG4gICAgICAgIGZsb2F0IHNwZWN1bGFyV2VpZ2h0ID0gcG93KG1heChkb3QoaGFsZlZlY3Rvciwgbm9ybWFsKSwgMC4wKSwgZ2xvc3NpbmVzcy5hKTtcXG4gICAgICAgIHZlYzMgc3BlY3VsYXJDb2xvciA9IGhhc1NwZWN1bGFyQ29sb3IgPyBnbG9zc2luZXNzLnJnYiA6IHVfbGlnaHRDb2xvcltpXS5yZ2I7XFxuICAgICAgICBkaWZmdXNlICs9IHNwZWN1bGFyQ29sb3IgKiBzcGVjdWxhcldlaWdodCAqIGxhbWJlcnRpYW47XFxuICAgICAgfVxcbiAgICB9XFxuICB9XFxuICByZXR1cm4gdmVjNChhbWJpZW50Q29sb3IgKyBkaWZmdXNlLCBiYXNlQ29sb3IuYSk7XFxufVxcbnZvaWQgbWFpbigpIHtcXG4gIHZlYzQgbWF0ZXJpYWwgPSB1X2Jhc2VDb2xvci5yID49IDAuMCA/IHVfYmFzZUNvbG9yIDogYV94X2FwcGx5TWF0ZXJpYWwodV9iYXNlQ29sb3IpO1xcbiAgYm9vbCBsaWdodHNFbmFibGVkID0gKHVfZmxhdFNoYWRpbmcgPT0gMC4wKSAmJiAodV9udW1MaWdodHMgPiAwLjAgfHwgbGVuZ3RoKHVfYW1iaWVudExpZ2h0KSA+IDAuMCk7XFxuICB2ZWMzIG5vcm1hbCA9IG5vcm1hbGl6ZSh2X25vcm1hbCk7XFxuICB2ZWM0IGdsb3NzaW5lc3MgPSB1X2dsb3NzaW5lc3MueCA8IDAuMCA/IGFfeF9hcHBseU1hdGVyaWFsKHVfZ2xvc3NpbmVzcykgOiB1X2dsb3NzaW5lc3M7XFxuICB2ZWM0IGNvbG9yID0gbGlnaHRzRW5hYmxlZCA/IGJfeF9hcHBseUxpZ2h0KG1hdGVyaWFsLCBub3JtYWxpemUodl9ub3JtYWwpLCBnbG9zc2luZXNzKSA6IG1hdGVyaWFsO1xcbiAgZ2xfRnJhZ0NvbG9yID0gY29sb3I7XFxuICBnbF9GcmFnQ29sb3IuYSAqPSB1X29wYWNpdHk7XFxufVwiLCBbXSwgW10pO1xubW9kdWxlLmV4cG9ydHMgPSBzaGFkZXJzOyIsIid1c2Ugc3RyaWN0JztcblxuLy8gRmFtb3VzIGRlcGVuZGVuY2llc1xudmFyIERPTUVsZW1lbnQgPSByZXF1aXJlKCdmYW1vdXMvZG9tLXJlbmRlcmFibGVzL0RPTUVsZW1lbnQnKTtcbnZhciBGYW1vdXNFbmdpbmUgPSByZXF1aXJlKCdmYW1vdXMvY29yZS9GYW1vdXNFbmdpbmUnKTtcblxuLy8gQm9pbGVycGxhdGUgY29kZSB0byBtYWtlIHlvdXIgbGlmZSBlYXNpZXJcbkZhbW91c0VuZ2luZS5pbml0KCk7XG5cbi8vIEluaXRpYWxpemUgd2l0aCBhIHNjZW5lOyB0aGVuLCBhZGQgYSAnbm9kZScgdG8gdGhlIHNjZW5lIHJvb3RcbnZhciBsb2dvID0gRmFtb3VzRW5naW5lLmNyZWF0ZVNjZW5lKCkuYWRkQ2hpbGQoKTtcblxuLy8gQ3JlYXRlIGFuIFtpbWFnZV0gRE9NIGVsZW1lbnQgcHJvdmlkaW5nIHRoZSBsb2dvICdub2RlJyB3aXRoIHRoZSAnc3JjJyBwYXRoXG5uZXcgRE9NRWxlbWVudChsb2dvLCB7IHRhZ05hbWU6ICdpbWcnIH0pXG4gICAgLnNldEF0dHJpYnV0ZSgnc3JjJywgJy4vaW1hZ2VzL2ZhbW91c19sb2dvLnBuZycpO1xuXG4vLyBDaGFpbmFibGUgQVBJXG5sb2dvXG4gICAgLy8gU2V0IHNpemUgbW9kZSB0byAnYWJzb2x1dGUnIHRvIHVzZSBhYnNvbHV0ZSBwaXhlbCB2YWx1ZXM6ICh3aWR0aCAyNTBweCwgaGVpZ2h0IDI1MHB4KVxuICAgIC5zZXRTaXplTW9kZSgnYWJzb2x1dGUnLCAnYWJzb2x1dGUnLCAnYWJzb2x1dGUnKVxuICAgIC5zZXRBYnNvbHV0ZVNpemUoMjUwLCAyNTApXG4gICAgLy8gQ2VudGVyIHRoZSAnbm9kZScgdG8gdGhlIHBhcmVudCAodGhlIHNjcmVlbiwgaW4gdGhpcyBpbnN0YW5jZSlcbiAgICAuc2V0QWxpZ24oMC41LCAwLjUpXG4gICAgLy8gU2V0IHRoZSB0cmFuc2xhdGlvbmFsIG9yaWdpbiB0byB0aGUgY2VudGVyIG9mIHRoZSAnbm9kZSdcbiAgICAuc2V0TW91bnRQb2ludCgwLjUsIDAuNSlcbiAgICAvLyBTZXQgdGhlIHJvdGF0aW9uYWwgb3JpZ2luIHRvIHRoZSBjZW50ZXIgb2YgdGhlICdub2RlJ1xuICAgIC5zZXRPcmlnaW4oMC41LCAwLjUpO1xuXG4vLyBBZGQgYSBzcGlubmVyIGNvbXBvbmVudCB0byB0aGUgbG9nbyAnbm9kZScgdGhhdCBpcyBjYWxsZWQsIGV2ZXJ5IGZyYW1lXG52YXIgc3Bpbm5lciA9IGxvZ28uYWRkQ29tcG9uZW50KHtcbiAgICBvblVwZGF0ZTogZnVuY3Rpb24odGltZSkge1xuICAgICAgICBsb2dvLnNldFJvdGF0aW9uKDAsIHRpbWUgLyAxMDAwLCAwKTtcbiAgICAgICAgbG9nby5yZXF1ZXN0VXBkYXRlT25OZXh0VGljayhzcGlubmVyKTtcbiAgICB9XG59KTtcblxuLy8gTGV0IHRoZSBtYWdpYyBiZWdpbi4uLlxubG9nby5yZXF1ZXN0VXBkYXRlKHNwaW5uZXIpO1xuIl19
