import React, { Component } from 'react';
import './App.css';
// import ReactTable from 'react-table';
import _ from 'lodash';
const IK = window.IK;
const THREE = window.THREE;
const global = (varName, obj) => {
  console.log(varName, obj);
  window[varName] = obj;
};

const Bone = (props) => {
  const info = JSON.stringify({
    ..._.pick(props, [
      'rotation',
      'scale',
      'position',
      'name',
      'matrixWorld',
    ]),
    childrenIds: _.map(props.children, bone => bone.name),
  }, null, '  ');
  const name = props.name;

  const style = {
    borderLeft: '1px solid gray',
    textAlign: 'left',
    padding: 5,
  };
  const toggleStyle = {
    fontSize: '70%',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: props.selected ? 'green' : props.isParent ? 'violet' : 'white',
  }

  return (
    <div style={style}>
      <div style={toggleStyle} onMouseDown={props.onClick}>{name}</div>
      {!props.collapsed && (
        <pre>
          {info}
        </pre>
      )}
    </div>
  );
}

const selectable = [
  'RightHand',
  'LeftHand',
  'RightToeBase',
  'LeftToeBase',
];

const joints = {
  'Hips': {
    x: [-3, 3],
    y: [-3, 3],
    z: [-3, 3],
  },
  'LeftArm': {
    y: [-1, 1],
    z: [-1.5, 1],
  },
  'LeftForeArm': {
    y: [-2, 0],
  },
  'LeftShoulder': {
    x: [-1.5, 1],
    y: [-2, 1],
  },
  'RightArm': {
    y: [-1, 1],
    z: [-1, 1.5],
  },
  'RightForeArm': {
    y: [0, 2],
  },
  'RightShoulder': {
    x: [-1, 1.5],
    y: [-1, 2],
  },
  'Spine': {
    x: [-1.5, 1.5],
    y: [-0.5, 0.5],
    z: [-1.5, 1.5],
  },
  'Spine1': {
    x: [-.2, 1.5],
    y: [-1, 1],
    z: [-1, 1],
  },
  'Spine2': {
    y: [-1, 1],
  },
  'LeftUpLeg': {
    x: [-3, 0.5],
  },
  'LeftLeg': {
    x: [0, 2.5],
    z: [-1.8, 0],
  },
  'LeftFoot': {
    x: [-1, 2],
  },
  'RightUpLeg': {
    x: [-3, 0.5],
    z: [0, 1.8],
  },
  'RightLeg': {
    x: [0, 2.5],
  },
  'RightFoot': {
    x: [-1, 2],
  },
};


class App extends Component {
  state = {
    bones: [],
    showing: {},
    selectedIndex: null,
    hoveredHold: null,
    hoveredIndex: null,
  }
  targets = []
  config = {
    constraintAngle: 100,
  }
  searchVersion = 0;
  container = React.createRef()
  async componentDidMount() {
    global('app', this);
    const renderer = new THREE.WebGLRenderer()
    const el = renderer.domElement
    this.container.current.appendChild(el)
    renderer.setPixelRatio(window.devicePixelRatio)

    const scene = new THREE.Scene()
    const scene2 = new THREE.Scene()
    const scene3 = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 20000 )
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.gammaOutput = true;

		function onWindowResize() {

			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();

			renderer.setSize( window.innerWidth, window.innerHeight );

		}
    window.addEventListener( 'resize', onWindowResize, false );
    onWindowResize();

    const animate = () => {
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(animate)
        renderer.render(scene, camera)
        renderer.clearDepth();
        renderer.setClearColor(0x000000, 1);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.autoClear = false;
        if ((this.state.selectedIndex === null || !this.dragging) && this.bones && this.bones[0]) {
          let controls = this.bones[0].position;
          const delta = (controls.y - this.controls.target.y) * 0.05;
          this.controls.target.y += delta;
          this.camera.position.y += delta;
        }
        // renderer.render(scene2, camera);
        // renderer.render(scene3, camera);
        this.forceUpdate();
      }
    }

    this.scene = scene
    this.scene2 = scene2
    this.scene3 = scene3
    this.camera = camera
    this.renderer = renderer


    const light = new THREE.HemisphereLight( 0xbbbbff, 0x444422 );
    light.position.set( 0, 1, 0 );
    scene.add( light );
    this.light = light;

    const controls = new THREE.OrbitControls( camera, el );
    camera.position.set(0, 90, 520);
    controls.target.set( 0, 90, 2.5);
    controls.update();

    this.controls = controls;

    animate();
    await this.load()

    this.rootBone = this.scene.children[1].children[0];
    this.skinMesh = this.scene.children[1].children[1];
    this.jointMesh = this.scene.children[1].children[2];
    global('skeleton', this.skinMesh.skeleton);
    const boneObjects = this.dfsBones(this.rootBone);
    const bones = this.skinMesh.skeleton.bones.map(({ name }) => (
      _.find(boneObjects, { name })
    ));
    // const bones = this.skinMesh.skeleton.bones;
    this.state.bones = bones;
    this.bones = bones;
    this.bonesMap = new Map();
    bones.forEach((bone, idx) => {
      bone.name = bone.name.substring(9);
      this.bonesMap.set(bone.name, idx);
    })
    this.recomputeColors();
    this.skinMesh.geometry.addAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    // this.skinMesh.material.opacity = 0.8;
    this.skinMesh.material.vertexColors = THREE.VertexColors;
    this.skinMesh.material.transparent = true;
    // this.jointMesh.material.opacity = 0.8;
    // this.jointMesh.material.vertexColors = THREE.VertexColors;
    this.jointMesh.material.transparent = true;

    const makeHolds = ({y, r, count}) => {
      const result = [];
      for (let i = 0; i < count; i += 1) {
        let x = Math.random()  - 0.5, z = Math.random() - 0.5;
        let d = Math.sqrt(x * x + z * z);
        x = x * r / d * .7;
        z = z * r / d  * .7;
        result.push(this.makeHold(x, y, z));
      }
      return result;
    }
    this.holds = [
      ...makeHolds({ y: 200, r: 100, count: 10, }),
      ...makeHolds({ y: 250, r: 100, count: 10, }),
      ...makeHolds({ y: 300, r: 90, count: 5, }),
      ...makeHolds({ y: 350, r: 80, count: 5, }),
      ...makeHolds({ y: 400, r: 70, count: 5, }),
      ...makeHolds({ y: 450, r: 60, count: 5, }),
      ...makeHolds({ y: 500, r: 50, count: 2, }),
      ...makeHolds({ y: 550, r: 60, count: 2, }),
      ...makeHolds({ y: 600, r: 70, count: 3, }),
      ...makeHolds({ y: 650, r: 80, count: 3, }),
      ...makeHolds({ y: 700, r: 100, count: 3, }),
      ...makeHolds({ y: 800, r: 100, count: 2, }),
      ...makeHolds({ y: 800, r: 100, count: 2, }),
      ...makeHolds({ y: 800, r: 200, count: 2, }),
      ...makeHolds({ y: 800, r: 300, count: 2, }),
      ...makeHolds({ y: 900, r: 200, count: 5, }),
      ...makeHolds({ y: 1000, r: 150, count: 5, }),
      ...makeHolds({ y: 1000, r: 100, count: 5, }),
    ]
    this.holds.forEach((hold, i) => {
      this.scene.add(hold)
      hold.holdIndex = i;
    });
    this.recomputeHoldColors();
    global('skinGeometry', this.skinMesh.geometry);
    const geometry = new THREE.SphereGeometry( 5, 3, 3 );
    const material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
    const sphere = new THREE.Mesh( geometry, material );
    this.light = sphere;
    this.light.position.set( 0, 0, 0);

    this.skinMesh = this.fbx.children[1];
    this.skeletonMesh = this.fbx.children[2];
    // const skeleton = new THREE.Skeleton(this.bones);
    // const highlightMesh = new THREE.SkinnedMesh(skinnedMesh.geometry, skinnedMesh.material);
    // highlightMesh.add(this.bones[1]);
    // highlightMesh.bind(skeleton);
    // this.scene.add(highlightMesh);
    // this.highlightMesh = highlightMesh;

    window.addEventListener('keydown', this.handleKeyDown);
    el.addEventListener('mousemove', this.handleMouseMove);
    el.addEventListener('mousedown', this.handleMouseDown);
    el.addEventListener('mouseup', this.handleMouseUp);

  }

  makeHold(x, y, z) {
    const geometry = new THREE.SphereGeometry( 5, 32, 32 );
    const material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
    const sphere = new THREE.Mesh( geometry, material );
    sphere.position.x = x;
    sphere.position.y = y;
    sphere.position.z = z;
    const colors = [
      0x000088,
      0x008800,
      0x880000,
      0x888800,
      0x880088,
    ]
    sphere.color = colors[Math.floor(Math.random() * colors.length)];
    return sphere;
  }

  recomputeHoldColors() {
    this.holds.forEach((hold, i) => {
      const mat = hold.material;
      if (_.find(this.targets, {holdIndex: i})) {
        mat.color = new THREE.Color(0x008888);
      } else if (this.state.hoveredHold === i) {
        mat.color = new THREE.Color(0xffffff);
      } else {
        mat.color = new THREE.Color(hold.color);
      }
    })
  }

  recomputeColors() {
    const selectedIndex = this.state.selectedIndex;
    const parentIndex = this.parentIndex;
    const hoveredIndex = this.state.hoveredIndex;
    const numVertices = 103440;
    const colors = new Float32Array(numVertices * 3);
    const skinIndex = this.skinMesh.geometry.getAttribute('skinIndex').array;
    const skinWeight = this.skinMesh.geometry.getAttribute('skinWeight').array;
    this.skinMesh.geometry.removeAttribute('color');

    const normalColor = [0.07752, 0.3372, 0.4176];
    const hoverColor = [1, 1, 1];
    const targetColor = [3, 3, 3];
    const parentColor = [238 / 256 ,130 / 256 ,238 / 256];
    const selectedColor = [0, 1, 0];

    const addColor = (ar, [r, g, b], weight) => {
      ar[0] += r * weight;
      ar[1] += g * weight;
      ar[2] += b * weight;
    };
    for (let i = 0; i < numVertices; i += 1) {
      let totalWeight = 0;
      let totalColor = [0, 0, 0];
      for (let j = 0; j < 4; j += 1) {
        const index = skinIndex[4 * i + j];
        let color, weight;
        if (false && index === hoveredIndex) {
          color = hoverColor;
          weight = 10;
        } else if (index === selectedIndex) {
          color = selectedColor;
          weight = 10
        } else if (_.find(this.targets, { idx: index }) ) {
          color = targetColor;
          weight = 5;
        } else  if (false && index === parentIndex) {
          color = parentColor;
          weight = 1;
        } else {
          color = normalColor;
          weight = 1;
        }
        weight *= skinWeight[4 * i + j];
        addColor(totalColor, color, weight);
        totalWeight += weight;
      }
      const [ r, g, b ] = totalColor
      colors[3 * i] = r / totalWeight;
      colors[3 * i + 1] = g / totalWeight;
      colors[3 * i + 2] = b / totalWeight;
    }
    this.colors = colors;
    this.skinMesh.geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  componentDidUpdate(prevProps, prevState) {
    // this.scene2.remove(...this.scene2.children);
    // this.scene3.remove(...this.scene3.children);

    if( this.state.selectedIndex !== prevState.selectedIndex || this.state.hoveredIndex !== prevState.hoveredIndex) {
      this.recomputeColors();
    }

    if (this.state.hoveredHold !== prevState.hoveredHold) {
      this.recomputeHoldColors();
    }

    // this.highlightMesh.geometry = selected;
    // const clonedMesh = selected.clone();
    // this.scene2.add(flatMesh);
    // this.scene3.add(clonedMesh);
  }

  async load() {
    const loader = new THREE.FBXLoader();

    const scene = this.scene;
    // const fbxUrl = './Minion_FBX.fbx';
    const fbxUrl = './Samba Dancing.fbx';
    const fbx = await new Promise((resolve, reject) => {
      loader.load(fbxUrl, ( fbx ) => {
        resolve(fbx);
      });
  	});
    console.log(fbx);
    this.fbx = fbx;
    scene.add(fbx);
    const box = new THREE.Box3().setFromObject( fbx );
    console.log( box.min, box.max, box.getSize() );
  }

  handleMouseDown = (ev) => {
    if (this.state.hoveredHold !== null) {
      if (this.state.selectedIndex) {
        console.log(this.state.hoveredHold, this.holds[this.state.hoveredHold]);
        this.setTarget(this.state.selectedIndex, this.holds[this.state.hoveredHold].position, this.state.hoveredHold);
        this.search();
        this.setState({
          selectedIndex: null,
        });
      }
    } else {
      if (this.state.hoveredIndex !== null) {
        this.setState({
          selectedIndex: this.state.hoveredIndex,
        })
      }
    }
  }

  handleMouseUp = (ev) => {
    this.mouseDown = false;
  }

  handleMouseMove = (ev) => {
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
  	mouse.x = ( ev.clientX / window.innerWidth ) * 2 - 1;
  	mouse.y = - ( ev.clientY / window.innerHeight ) * 2 + 1;
    raycaster.setFromCamera( mouse, this.camera );
    const intersects = raycaster.intersectObjects(this.holds);
    if (intersects.length > 0) {
      const hold = intersects[0].object;
      console.log(hold);
      this.setState({
        hoveredHold: hold.holdIndex,
      });
    } else {
      this.setState({
        hoveredHold: null,
      });
    }

    if (this.dragging && this.state.selectedIndex !== null && !_.find(this.targets, {idx: this.state.selectedIndex, temp: false})) {
      console.log(this.state.selectedIndex, this.bones[this.state.selectedIndex]);
      const pos = new THREE.Vector3().copy(this.bones[this.state.selectedIndex].position);
      pos.sub(raycaster.ray.origin).projectOnVector(raycaster.ray.direction).add(raycaster.ray.origin);
      console.log('temp target', pos)
      this.setTarget(this.state.selectedIndex, pos, null, {
        temp: true
      });

      this.search();
    }
  }

  handleKeyUp = ev => {
    const code = ev.key;
    if (code === 'Enter') {
      this.dragging = false;
    }
  }

  handleKeyDown = (ev) => {
    const code = ev.key;
    console.log(ev);
    const rawcode = ev.code;

    if (ev.metaKey || ev.ctrlKey) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (code === ' ') {
      if (this.state.selectedIndex !== null) {
        this.clearTarget(this.state.selectedIndex);
      }
      this.search();
      return;
    }
    console.log(code);
    if (code === 'Escape') {
      this.clearTempTargets();
      this.setState({
        selectedIndex: null,
      });
      this.search();
    }
    if (code === 'Tab') {
      const a = _.indexOf(selectable, _.get(this.bones, [this.state.selectedIndex, 'name']));
      const b = _.findIndex(this.bones, { name: selectable[(a + (ev.shiftKey ? 1 : (selectable.length - 1))) % selectable.length] });
      console.log(a, b);
      this.setState({selectedIndex: b})
    }
    if (code === 'Enter') {
      if (this.dragging) {
        this.clearTempTargets();
        this.dragging = false;
      } else {
        this.dragging = true;
      }
    }
    console.log(ev);
    if (rawcode.startsWith('Digit')) {
      console.log('digit', rawcode);
      const num = parseInt(rawcode.substring(5));
      if (num <= 4) {
        this.setState({
          selectedIndex: _.findIndex(this.bones, { name: selectable[num - 1] })
        })
      }
    }
    const bone = this.state.bones[this.state.selectedIndex];
    if (!bone) return;
    const joint = joints[bone.name] || {};

    const translateKey = code => {
      const delta = 0.1;
      if (code === 'w') {
        return { delta: -delta, axis: 'x' };
      } else if (code === 's') {
        return { delta, axis: 'x' };
      } else if (code === 'a') {
        return { delta, axis: 'z' };
      } else if (code === 'd') {
        return { delta: -delta, axis: 'z' };
      } else if (code === 'q') {
        return { delta: -delta, axis: 'y' };
      } else if (code === 'e') {
        return { delta, axis: 'y' };
      }
    }
    const { delta, axis } = translateKey(code) || {};
    if (!axis) return;
    const { [axis]: constraint = [0, 0] } = joint;
    let newRotation = bone.rotation[axis] + delta;
    // newRotation =_.clamp(newRotation, ...constraint);
    bone.rotation[axis] = newRotation;
  }

  get parentIndex() {
    const bone = this.state.bones[this.state.selectedIndex];
    if (!bone) return;
    const parentBone = bone.parent;
    if (!parentBone) return;
    const parentIndex = this.bonesMap.get(parentBone.name);
    return parentIndex
  }

  dfsBones = (bone) => {
    const result = [bone];
    bone.children.forEach(bone => {
      result.push(...this.dfsBones(bone));
    });
    return result;
  }

  handleToggleCollapse(i) {
    this.setState({
      showing: {
        ...this.state.showing,
        [i]: !this.state.showing[i],
      }
    })
  }

  render() {
    const stateStyle = {
      position: 'absolute',
      padding: 20,
      top: 5,
      left: 5,
      color: 'white',
      backgroundColor: '#222222AA',
      border: '1px solid white',
      overflow: 'auto',
      height: '80%',
    };
    const instructionsStyle = {
      position: 'absolute',
      padding: 20,
      top: 5,
      right: 5,
      color: 'white',
      backgroundColor: '#222222AA',
      border: '1px solid white',
      overflow: 'auto',
      textAlign: 'left',
    }
    return (
      <div className="App">
        <div ref={this.container}/>
        <div style={instructionsStyle} hidden>
          Click a bone in the Bones Panel to select a bone.<br/>
          Press Tab to select next bone.<br/>
          Press WS/AD/QE to rotate selected bone.<br/>
          <button onClick={this.search}>Search</button>

        </div>
        <div style={instructionsStyle}>
          Press Tab to select next limb.<br/>
          Click to grab a hold.<br/>
          Press Spacebar to release hold.<br/>
          Scroll to zoom.<br/>
          Click & drag to rotate the camera.<br/>
          {(!this.bones || !this.bones.length) && "Loading climber..."}
        </div>
        <div style={stateStyle}>
          {_.map(this.state.bones, (bone, i) => (
            <Bone
              key={i}
              onClick={(e) => {e.preventDefault();this.handleToggleCollapse(i); this.setState({selectedIndex: i})}}
              collapsed={!this.state.showing[i]}
              selected={this.state.selectedIndex === i}
              isParent={this.parentIndex === i}
              {...bone}
            />
          ))}
        </div>
      </div>
    );
  }

  clearTarget = idx => {
    this.targets = _.filter(this.targets, ({ idx: _idx }) => _idx !== idx);
  }

  clearTempTargets = () => {
    this.targets = _.filter(this.targets, ({ temp }) => !temp);
  }
  setTarget = (idx, pos, holdIndex, {
    temp = false,
  } = {}) => {
    this.targets = _.filter(this.targets, ({ idx: _idx, temp}) => _idx !== idx && !temp);
    this.targets.push({
      idx,
      pos,
      holdIndex,
      temp,
    });
  }

  search = async () => {
    this.searchVersion += 1;
    const searchVersion = this.searchVersion;
    console.log('search version is', searchVersion);
    console.time();
    const targets = this.targets;
    const computeLoss = () => {
      this.scene.updateMatrixWorld();
      const rotations = this.bones.map(bone => new THREE.Euler().copy(bone.rotation))
      let sum = 0;
      for (const target of targets) {
        const { idx, pos } = target;
        const bone = this.bones[idx];
        const mat = bone.matrixWorld.elements;
        const actualPos = new THREE.Vector3(mat[12], mat[13], mat[14]);
        const length = actualPos.distanceTo(pos);
        // console.log('computeloss', target, bone, actualPos, pos, length);
        sum += (target.temp ? 1 : 5) * length * length;
      }

      // "flexibility" term
      for (const rot of rotations) {
        for (const dim of ['x', 'y', 'z']) {
          sum += .5 * Math.abs(rot[dim]) * (rot === rotations[0] ? 0.1 : 1);
        }
      }

      // "gravity" term
      for (const bone of this.bones) {
        const mat = bone.matrixWorld.elements;
        sum += 1 * Math.max(-200, mat[13]);
        if (mat[13] < -200) {
          sum += -200 - mat[13];
        }
        // if (mat[13] < -200) sum -= 0.5 * mat[13] + 200;
      }


      return sum;
    };

    const getState = () => {
      const rootPos = new THREE.Vector3().copy(this.bones[0].position);
      const rotations = this.bones.map(bone => new THREE.Euler().copy(bone.rotation))
      return {
        rootPos,
        rotations,
      }
    };
    const randomPointOnSphere = () => {
      let x = -1 + Math.random() * 2;
      let y = -1 + Math.random() * 2;
      let z = -1 + Math.random() * 2;
      const d = 1 / Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2));
      x *= d;
      y *= d;
      z *= d;
      return new THREE.Vector3(x, y, z);
    };

    const perturbPos = pos => {
      const result = randomPointOnSphere().multiplyScalar(.2).add(pos);
      return result;
    };
    const perturbRot = (rot, bounds = {}, prob) => {
      if (Math.random() > prob) return rot;
      rot = new THREE.Euler().copy(rot);
      for (const dim of ['x', 'y', 'z']) {
        const constraints = bounds[dim] || [0, 0];
        rot[dim] = _.clamp(rot[dim] * .98 + (Math.random() - 0.5) * 0.2, ...constraints);
      }
      return rot;
    };
    const perturb = ({ rootPos, rotations }) => {
      return {
        rootPos: perturbPos(rootPos),
        rotations: _.map(rotations, (r, i) => perturbRot(r, joints[this.bones[i].name], .1)),
        // rotations: _.assign([], rotations, { [i]: perturbRot(rotations[i], joints[this.bones[i].name]), })
      };
    };
    const setState = ({ rootPos, rotations }) => {
      this.skinMesh.position.copy(rootPos);
      this.skeletonMesh.position.copy(rootPos);
      this.bones[0].position.copy(rootPos);
      for (let i = 0; i < rotations.length; i += 1) {
        this.bones[i].rotation.copy(rotations[i]);
      }
    };
    let temperature = 0.1;
    let bestLoss = computeLoss();
    let bestState = getState();
    let prevLoss = computeLoss();
    const animationFrame = () => {
      return new Promise((resolve, reject) => {
        requestAnimationFrame(resolve);
      });
    }
    const nextTick = () => {
      return new Promise((resolve, reject) => {
        setTimeout(resolve, 0);
      })
    }

    for (let i = 0; i < 10000; i += 1) {
      if (this.searchVersion > searchVersion){
        console.log('ending', searchVersion);
        return;
      }
      if (i % 100 === 0) {
        setState(bestState);
        await animationFrame();
        await nextTick();
      }
      temperature *= 0.98;
      const initialState = getState();

      const nextState = perturb(initialState);


      setState(nextState);
      const loss = computeLoss();
      if (loss < bestLoss) {
        bestLoss = loss;
        bestState = nextState;
      }

      if (loss > prevLoss && Math.random() > temperature) {
        setState(initialState);
      } else {
        prevLoss = loss;
      }
    }
    console.log('LOSS is', computeLoss());
    console.log('best loss is', bestLoss);
    console.timeEnd();
  }

  wiggle() {
    console.log('wiggling');
    for (const bone of this.bones) {
      for (const axis of ['x', 'y', 'z']) {
        const delta = (Math.random() - 0.5) * 2;
        bone.rotation[axis] += delta;
        const constraint = _.get(joints, [bone.name, axis], [0, 0]);
        bone.rotation[axis] = _.clamp(bone.rotation[axis], ...constraint);
      }
    }
  }
}

export default App;
