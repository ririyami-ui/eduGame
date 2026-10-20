# Humanoid Model

This model is a simple, low-poly humanoid character. It's rigged and ready for basic animation.

## Usage

Place this file in the `public/models/` directory of your project. Then, use `@react-three/drei`'s `useGLTF` hook to load it:

```javascript
import { useGLTF } from '@react-three/drei';

function Character() {
  const gltf = useGLTF('/models/humanoid.glb');
  return <primitive object={gltf.scene} scale={1.5} />;
}
```

## Preview

![Humanoid Preview](preview.png)
