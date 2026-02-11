import { createPortal } from 'react-dom';
import { ToastContainer } from 'react-toastify';
import './ToastBox.css';

export default function ToastBox(){
  if (typeof document === 'undefined') return null;
  return createPortal(
    <ToastContainer
      containerId="app-toast"
      position="top-center"
      autoClose={5000}
      hideProgressBar
      newestOnTop
      closeOnClick
      draggable={false}
      pauseOnHover={false}
      className="appToastContainer"
      toastClassName="appToast"
      bodyClassName="appToastBody"
      style={{ top: 0, left: '50%', transform: 'translateX(-50%)', padding: 0, margin: 0, pointerEvents: 'none' }}
    />,
    document.body
  );
}
