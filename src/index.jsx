import ReactDOM from 'react-dom/client';
import { DemoList } from './component/DemoList';
import './index.css';
import { defaultDemo } from './demolist';

function App() {
    return <>
        <div className='DemoListDiv'>
            <DemoList></DemoList>
        </div>
        <div className='DemoFrameDiv'>
            <iframe id='demo-frame' src={defaultDemo}></iframe>
        </div>
    </>;
}

const root = ReactDOM.createRoot(document.getElementById('root-div'));
root.render(<App />);