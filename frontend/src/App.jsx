import { useDesignStore } from './store/useDesignStore.js';
import Home from './components/Home/Home.jsx';
import EditorLayout from './components/Editor/EditorLayout.jsx';
import AccessibilityBar from './components/AccessibilityBar.jsx';

export default function App() {
  const project = useDesignStore((s) => s.project);

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <AccessibilityBar />
      <div id="main-content">{project ? <EditorLayout /> : <Home />}</div>
    </>
  );
}
