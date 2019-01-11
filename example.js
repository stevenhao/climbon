// modified version of http://threejs.org/examples/webgl_interactive_cubes_gpu.html

var container, stats;
var camera, controls, scene, renderer;
var pickingData = [],
    pickingTexture, pickingScene;
var objects = [];
var highlightShape;
var pixelBuffer = new Uint8Array(4);
var highlightShape2, scene2, scene3;

var mouse = new THREE.Vector2();
var offset = new THREE.Vector3(10, 10, 10);

init();
animate();

function init() {

    container = document.getElementById("container");

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 1000;

    controls = new THREE.TrackballControls(camera);
    //controls.rotateSpeed = 1.0;
    //controls.zoomSpeed = 1.2;
    //controls.panSpeed = 0.8;
    //controls.noZoom = false;
    //controls.noPan = false;
    //controls.staticMoving = true;
    //controls.dynamicDampingFactor = 0.3;

    scene = new THREE.Scene();
    scene2 = new THREE.Scene();
    scene3 = new THREE.Scene();

    pickingScene = new THREE.Scene();
    pickingTexture = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
    pickingTexture.generateMipmaps = false;

    scene.add(new THREE.AmbientLight(0x555555));
    scene3.add(new THREE.AmbientLight(0x555555));

    var light = new THREE.SpotLight(0xffffff, 1.5);
    light.position.set(0, 500, 2000);
    scene.add(light);
    var light2 = light.clone();
    light2.position = light.position;
    scene3.add(light2);

    var geometry = new THREE.Geometry(),
        pickingGeometry = new THREE.Geometry(),
        pickingMaterial = new THREE.MeshBasicMaterial({
            vertexColors: THREE.VertexColors
        }),
        defaultMaterial = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            shading: THREE.FlatShading,
            vertexColors: THREE.VertexColors
        });

    function applyVertexColors(g, c) {

        g.faces.forEach(function (f) {

            for (var j = 0; j < 3; j++) {

                f.vertexColors[j] = c;

            }

        });

    }

    for (var i = 1; i < 500; i++) { // start at 1 to avoid id of 0

        var position = new THREE.Vector3();

        position.x = Math.random() * 6000 - 3000;
        position.y = Math.random() * 6000 - 3000;
        position.z = Math.random() * 6000 - 3000;

        var rotation = new THREE.Euler();

        //rotation.x = Math.random() * 2 * Math.PI;
        rotation.y = Math.random() * 2 * Math.PI;
        //rotation.z = Math.random() * 2 * Math.PI;

        var scale = new THREE.Vector3();

        scale.x = Math.random() * 200 + 100;
        scale.y = Math.random() * 200 + 100;
        scale.z = Math.random() * 200 + 100;

        // give the geom's vertices a random color, to be displayed

        var geom = new THREE.SphereGeometry(1, 4, 3);
        var color = new THREE.Color(Math.random() * 0xffffff);
        applyVertexColors(geom, color);

        var cube = new THREE.Mesh(geom);
        cube.position.copy(position);
        cube.rotation.copy(rotation);
        cube.scale.copy(scale);

        THREE.GeometryUtils.merge(geometry, cube);

        //give the pickingGeom's vertices a color corresponding to the "id"

        var pickingGeom = new THREE.SphereGeometry(1, 4, 3);
        var pickingColor = new THREE.Color(i);
        applyVertexColors(pickingGeom, pickingColor);

        var pickingCube = new THREE.Mesh(pickingGeom);
        pickingCube.position.copy(position);
        pickingCube.rotation.copy(rotation);
        pickingCube.scale.copy(scale);

        THREE.GeometryUtils.merge(pickingGeometry, pickingCube);

        pickingData[i] = {

            position: position,
            rotation: rotation,
            scale: scale,
            color: color

        };

    }

    var drawnObject = new THREE.Mesh(geometry, defaultMaterial);
    scene.add(drawnObject);

    pickingScene.add(new THREE.Mesh(pickingGeometry, pickingMaterial));

    highlightShape = new THREE.Mesh(new THREE.SphereGeometry(1, 4, 3), new THREE.MeshBasicMaterial({
        color: 0xffff00,
        depthWrite: false
    }));
    scene2.add(highlightShape);
    highlightShape2 = new THREE.Mesh(new THREE.SphereGeometry(1, 4, 3), new THREE.MeshLambertMaterial({
        shading: THREE.FlatShading
    }));
    scene3.add(highlightShape2);

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setClearColor(0x000000, 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;

    container.appendChild(renderer.domElement);

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild(stats.domElement);

    renderer.domElement.addEventListener('mousemove', onMouseMove);

}

//

function onMouseMove(e) {

    mouse.x = e.clientX;
    mouse.y = e.clientY;

}

function animate() {

    requestAnimationFrame(animate);

    render();
    stats.update();

}

function pick() {

    //render the picking scene off-screen

    renderer.render(pickingScene, camera, pickingTexture, true);

    var gl = renderer.getContext();

    //read the pixel under the mouse from the texture

    gl.readPixels(mouse.x, pickingTexture.height - mouse.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuffer);

    //interpret the pixel as an ID

    var id = (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | (pixelBuffer[2]);
    var data = pickingData[id];

    if (data) {

        //move our highlightShape so that it surrounds the picked object

        if (data.position && data.rotation && data.scale) {

            highlightShape.position.copy(data.position);
            highlightShape.rotation.copy(data.rotation);
            highlightShape.scale.copy(data.scale).add(offset.clone().multiplyScalar(0.001 * (camera.position.distanceTo(data.position)))); // hack to make size about the same regardless of disance from camera
            highlightShape.visible = true;

            highlightShape2.position.copy(data.position);
            highlightShape2.rotation.copy(data.rotation);
            highlightShape2.scale.copy(data.scale);
            highlightShape2.visible = true;
            highlightShape2.material.color.copy(data.color);

        }

    } else {

        highlightShape.visible = false;
        highlightShape2.visible = false;

    }

}

function render() {

    controls.update();

    pick();

    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(scene2, camera);
    renderer.render(scene3, camera);

}
