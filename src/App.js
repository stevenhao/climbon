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

const joints = {
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
    y: [-.2, .2],
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
  },
  'LeftFoot': {
    x: [-1, 1],
  },
  'RightUpLeg': {
    x: [-3, 0.5],
  },
  'RightLeg': {
    x: [0, 2.5],
  },
  'RightFoot': {
    x: [-1, 1],
  },
};


class App extends Component {
  state = {
    bones: [],
    showing: {},
    selectedIndex: -1,
  }
  targets = []
  config = {
    constraintAngle: 100,
  }
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
    const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.25, 2000 )
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
    this.skinMesh.material.opacity = 0.8;
    this.skinMesh.material.vertexColors = THREE.VertexColors;
    this.skinMesh.material.transparent = true;
    this.jointMesh.material.opacity = 0.8;
    // this.jointMesh.material.vertexColors = THREE.VertexColors;
    this.jointMesh.material.transparent = true;

    this.holds = [
      this.makeHold(0, 0, 0),
      this.makeHold(50, 100, 0),
      this.makeHold(0, 200, 5),
      this.makeHold(-80, 400, 10),
    ];
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

    // const skinnedMesh = this.fbx.children[1];
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
    return sphere;
  }

  recomputeHoldColors() {
    this.holds.forEach((hold, i) => {
      const mat = hold.material;
      if (this.state.hoveredHold === i) {
        mat.color = new THREE.Color(0x00ff00);
      } else {
        mat.color = new THREE.Color(0x0000ff);
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
        if (index === hoveredIndex) {
          color = hoverColor;
          weight = 10;
        } else if (index === selectedIndex) {
          color = selectedColor;
          weight = 10
        } else  if (index === parentIndex) {
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
      console.log('recompute hold');
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
      if (this.state.selectedIndex !== null) {
        this.setTarget(this.state.selectedIndex, this.holds[this.state.hoveredHold].position);
        this.search();
      }
    } else {
      this.setState({
        selectedIndex: this.state.hoveredIndex,
      })
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
    console.log(intersects);
    if (intersects.length > 0) {
      const hold = intersects[0].object;
      console.log('intersecting', hold, hold.holdIndex);
      this.setState({
        hoveredHold: hold.holdIndex,
      });
      return;
    }

    const positions = [];
    let mind, minbone;
    this.bones.forEach((bone, i) => {
      const mat = bone.matrixWorld.elements;
      const p = new THREE.Vector3(mat[12], mat[13], mat[14]);
      positions.push(p);
      const d = new THREE.Vector3().copy(p).sub(raycaster.ray.origin).cross(raycaster.ray.direction).length();
      if (!mind || d < mind) {
        mind = d;
        minbone = i;
      }
    });
    const hoveredIndex = mind < 20 ? minbone : null;
    this.setState({
      hoveredIndex,
      hoveredHold: null,
    });
  }

  handleKeyDown = (ev) => {
    const code = ev.key;
    if (ev.metaKey || ev.ctrlKey) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (code === ' ') {
      this.wiggle();
      return;
    }
    if (code === 'Tab') {
      this.setState({
        selectedIndex: (this.state.selectedIndex + (ev.shiftKey ? (this.state.bones.length - 1) : 1)) % Math.max(1, this.state.bones.length),
      })
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
        <div style={instructionsStyle}>
          Click a bone in the Bones Panel to select a bone.<br/>
          Press Tab to select next bone.<br/>
          Press WS/AD/QE to rotate selected bone.<br/>
          <button onClick={this.search}>Search</button>

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

  setTarget = (idx, pos) => {
    this.targets = _.filter(this.targets, ({ idx: _idx, pos }) => _idx !== idx);
    this.targets.push({
      idx,
      pos,
    });
  }

  search = () => {
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
        sum += length * length;
      }

      // "flexibility" term
      for (const rot of rotations) {
        for (const dim of ['x', 'y', 'z']) {
          sum += .5 * Math.abs(rot[dim]);
        }
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
      const result = randomPointOnSphere().multiplyScalar(1).add(pos);
      return result;
    };
    const perturbRot = (rot, bounds = {}) => {
      rot = new THREE.Euler().copy(rot);
      for (const dim of ['x', 'y', 'z']) {
        const constraints = bounds[dim] || [0, 0];
        rot[dim] = _.clamp(rot[dim] * .98 + (Math.random() - 0.5) * 0.2, ...constraints);
      }
      return rot;
    };
    const perturb = ({ rootPos, rotations }) => {
      const i = Math.floor(Math.random() * rotations.length);
      return {
        // rootPos: perturbPos(rootPos),
        rootPos,
        rotations: _.map(rotations, (r, i) => perturbRot(r, joints[this.bones[i].name])),
        // rotations: _.assign([], rotations, { [i]: perturbRot(rotations[i], joints[this.bones[i].name]), })
      };
    };
    const setState = ({ rootPos, rotations }) => {
      this.bones[0].position.copy(rootPos);
      for (let i = 0; i < rotations.length; i += 1) {
        this.bones[i].rotation.copy(rotations[i]);
      }
    };
    let temperature = 0.5;
    let bestLoss = computeLoss();
    let prevLoss = computeLoss();
    for (let i = 0; i < 5000; i += 1) {
      temperature *= 0.95;
      const initialState = getState();

      const nextState = perturb(initialState);


      setState(nextState);
      const loss = computeLoss();
      if (loss < bestLoss) bestLoss = loss;

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
