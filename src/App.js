import React, { Component } from 'react';
import './App.css';
import * as THREE from 'three-full';
// import ReactTable from 'react-table';
import _ from 'lodash';

const Bone = (props) => {
  console.log('Bone', props);
  const info = JSON.stringify({
    ..._.pick(props, [
      'rotation',
      'scale',
      'position',
      'uuid',
    ]),
    childrenIds: _.map(props.children, bone => bone.uuid),
  }, null, '  ');
  const name = props.uuid;

  const style = {
    borderLeft: '1px solid gray',
    textAlign: 'left',
    padding: 5,
  };
  const toggleStyle = {
    fontSize: '70%',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: props.selected ? 'cyan' : 'white',
  }

  return (
    <div style={style}>
      <div style={toggleStyle} onClick={props.onClick}>{name}</div>
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
  componentDidMount() {
    window.app = this;
    const renderer = new THREE.WebGLRenderer()
    const el = renderer.domElement
    this.container.current.appendChild(el)
    renderer.setPixelRatio(window.devicePixelRatio)

    const scene = new THREE.Scene()
    const scene2 = new THREE.Scene()
    const scene3 = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.25, 20 )
    console.log(el, renderer)
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.gammaOutput = true;

    const animate = () => {
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(animate)
        renderer.render(scene, camera)
        renderer.clearDepth();
        renderer.setClearColor(0x000000, 1);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.autoClear = false;

        renderer.render(scene2, camera);
        renderer.render(scene3, camera);
      }
    }

    this.scene = scene
    this.scene2 = scene2
    this.scene3 = scene3
    this.camera = camera

    const light = new THREE.HemisphereLight( 0xbbbbff, 0x444422 );
    light.position.set( 0, 1, 0 );
    scene.add( light );


    const controls = new THREE.OrbitControls( camera, el );
    controls.target.set( -1, 0.2, 1);
    controls.update();


    const outlinePass = new THREE.OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
    const composer = new THREE.EffectComposer( renderer );

    this.outlinePass = outlinePass;

    composer.addPass( outlinePass );
    animate();
    this.load()

    window.addEventListener('keydown', this.handleKeyDown);
  }

  componentDidUpdate() {
    this.scene2.remove(...this.scene2.children);
    this.scene3.remove(...this.scene3.children);

    const selected = this.state.bones[this.state.selectedIndex];
    if (!selected) return;

    const flatMesh = selected.clone();

    this.scene2.add(flatMesh);
  }

  handleKeyDown = (ev) => {
    console.log(ev);
    const code = ev.key;
    if (code === 'Tab') {
      this.setState({
        selectedIndex: (this.state.selectedIndex + 1) % Math.max(1, this.state.bones.length),
      })
    }
    const bone = this.state.bones[this.state.selectedIndex];
    if (!bone) return;
    if (code === 'w') {
      bone.rotation.z += 0.1;
    } else if (code === 's') {
      bone.rotation.z -= 0.1;
    } else if (code === 'a') {
      bone.rotation.x += 0.1;
    } else if (code === 'd') {
      bone.rotation.x -= 0.1;
    } else if (code === 'q') {
    bone.rotation.y += 0.1;
  } else if (code === 'e') {
    bone.rotation.y -= 0.1;
  }
    ev.preventDefault();
    ev.stopPropagation();
  }

  dfsBones = (bone) => {
    const result = [bone];
    bone.children.forEach(bone => {
      result.push(...this.dfsBones(bone));
    });
    return result;
  }

  load() {
    const loader = new THREE.GLTFLoader();

    const scene = this.scene;
    const gltfUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMan/glTF/CesiumMan.gltf';
    loader.load(gltfUrl, ( gltf ) => {
      console.log(gltf.scene);
      window.a = gltf.scene;
  		scene.add( gltf.scene );
      const rootbone = gltf.scene.children[0].children[0].children[0];
      const bones = this.dfsBones(rootbone);
      this.setState({
        bones,
      });

  		// gltf.animations; // Array<THREE.AnimationClip>
  		// gltf.scene; // THREE.Scene
  		// gltf.scenes; // Array<THREE.Scene>
  		// gltf.cameras; // Array<THREE.Camera>
  		// gltf.asset; // Object

  	});
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
      backgroundColor: '#222',
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
      backgroundColor: '#222',
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
              onClick={() => {this.handleToggleCollapse(i); this.setState({selectedIndex: i})}}
              collapsed={!this.state.showing[i]}
              selected={this.state.selectedIndex === i}
              {...bone}
            />
          ))}
        </div>
      </div>
    );
  }
}

export default App;
