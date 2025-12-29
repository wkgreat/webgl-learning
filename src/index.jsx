import "@radix-ui/themes/styles.css";
import ReactDOM from 'react-dom/client';
import { DemoList } from './component/DemoList';
import './index.css';
import { defaultDemo } from './demolist';
import { Box, Flex, Grid, Theme } from "@radix-ui/themes";


function App() {
    return <Theme appearance="dark" radius="none">
        <Grid columns="20% 80%" height="100%" gap="0" width="100%">
            <Box className="ClsGridColumn">
                <DemoList></DemoList>
            </Box>
            <Box className="ClsGridColumn">
                <iframe id='demo-frame' src={defaultDemo}></iframe>
            </Box>
        </Grid>
    </Theme>;
}

const root = ReactDOM.createRoot(document.getElementById('root-div'));
root.render(<App />);