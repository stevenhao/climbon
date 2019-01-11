import React, { Component } from 'react';
import './App.css';
// import ReactTable from 'react-table';
import _ from 'lodash';

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
    color: props.selected ? 'cyan' : props.isParent ? 'violet' : 'white',
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

class App extends Component {
  state = {
    bones: [],
    showing: {},
    selectedIndex: -1,
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
    this.bonesMap = new Map();
    bones.forEach((bone, idx) => {
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

    global('skinGeometry', this.skinMesh.geometry);
    window.skinGeometry = this.skinMesh.geometry;
    console.log('skinGeometry', window.skinGeometry);
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
  }

  recomputeColors() {
    const selectedIndex = this.state.selectedIndex;
    const numVertices = 103440;
    const colors = new Float32Array(numVertices * 3);
    const skinIndex = this.skinMesh.geometry.getAttribute('skinIndex').array;
    const skinWeight = this.skinMesh.geometry.getAttribute('skinWeight').array;
    this.skinMesh.geometry.removeAttribute('color');

    const mixColors = ([r1, g1, b1], [r2, g2, b2], w2) => {
      const w1 = 1 - w2;
      return [
        r1 * w1 + r2 * w2,
        g1 * w1 + g2 * w2,
        b1 * w1 + b2 * w2,
      ]
    };
    for (let i = 0; i < numVertices; i += 1) {
      let selectedWeight = 0;
      for (let j = 0; j < 4; j += 1) {
        if (skinIndex[4 * i + j] === selectedIndex) {
          selectedWeight += skinWeight[4 * i + j];
        }
      }
      let [r, g, b] = mixColors([0.07752, 0.3372, 0.4176], [1, 1, 1], selectedWeight * 3);
      colors[3 * i] = r;
      colors[3 * i + 1] = g;
      colors[3 * i + 2] = b;
    }
    this.colors = colors;
    this.skinMesh.geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  componentDidUpdate(prevProps, prevState) {
    // this.scene2.remove(...this.scene2.children);
    // this.scene3.remove(...this.scene3.children);

    const selected = this.state.bones[this.state.selectedIndex];
    if( this.state.selectedIndex === prevState.selectedIndex) return;
    this.recomputeColors();

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

  handleKeyDown = (ev) => {
    const code = ev.key;
    if (ev.metaKey || ev.ctrlKey) return;
    ev.preventDefault();
    ev.stopPropagation();

    if (code === 'Tab') {
      this.setState({
        selectedIndex: (this.state.selectedIndex + (ev.shiftKey ? (this.state.bones.length - 1) : 1)) % Math.max(1, this.state.bones.length),
      })
    }
    const bone = this.state.bones[this.state.selectedIndex];
    if (!bone) return;
    if (code === 'w') {
      bone.rotation.x -= 0.1;
    } else if (code === 's') {
      bone.rotation.x += 0.1;
    } else if (code === 'a') {
      bone.rotation.z += 0.1;
    } else if (code === 'd') {
      bone.rotation.z -= 0.1;
    } else if (code === 'q') {
      bone.rotation.y -= 0.1;
    } else if (code === 'e') {
      bone.rotation.y += 0.1;
    }
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
          Press WS/AD/QE to rotate selected bone.
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
}

export default App;
