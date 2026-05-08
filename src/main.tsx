import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Popup from './Popup.tsx'
import '@szhsin/react-menu/dist/index.css';
import '@szhsin/react-menu/dist/transitions/zoom.css';
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './index.scss'

if (process.env.NODE_ENV !== 'development') {
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}

createRoot(document.getElementById('locket_app')!).render(
    <StrictMode>
        <Popup />
    </StrictMode>,
)
