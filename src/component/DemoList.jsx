import * as ScrollArea from '@radix-ui/react-scroll-area';
import demos from '../demolist';
import './styles.css';
import * as Tabs from '@radix-ui/react-tabs';

const Content = (props) => {

    const gltype = props.gltype;
    const demos = props.demos;

    return (
        <div style={{ lineHeight: '30px' }}>
            {demos.map((d) => (
                <div className="DemoOption" key={d.name}>
                    <div className='DemoOptionHeader'>
                        <div className='DemoOptionName'>{d.name}</div>
                        <div><button className='DemoLoadButton' onClick={() => {
                            const frame = document.getElementById('demo-frame');
                            frame.setAttribute('src', `./${gltype}-${d.name}.html`);
                        }}>Show</button></div>
                    </div>
                    <div className='DemoOptionDescribe'>{d.describe}</div>
                </div>
            ))}
        </div>
    );
};

export const DemoList = () => (
    <Tabs.Root className="TabsRoot" defaultValue="tab1">
        <Tabs.List className="TabsList" aria-label="Manage your account">
            <Tabs.Trigger className="TabsTrigger" value="tab1">
                WebGL
            </Tabs.Trigger>
            <Tabs.Trigger className="TabsTrigger" value="tab2">
                WebGPU
            </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content className="TabsContent" value="tab1">
            <SingleDemoList demos={demos.webglDemos} gltype="webgl"></SingleDemoList>
        </Tabs.Content>
        <Tabs.Content className="TabsContent" value="tab2">
            <SingleDemoList demos={demos.webgpuDemos} gltype="webgpu"></SingleDemoList>
        </Tabs.Content>
    </Tabs.Root>

);

export const SingleDemoList = (props) => (

    <ScrollArea.Root className="ScrollAreaRoot">

        <ScrollArea.Viewport className="ScrollAreaViewport">
            <Content demos={props.demos} gltype={props.gltype} />
        </ScrollArea.Viewport>

        <ScrollArea.Scrollbar
            className="ScrollAreaScrollbar"
            orientation="vertical"
        >
            <ScrollArea.Thumb className="ScrollAreaThumb" />
        </ScrollArea.Scrollbar>

        <ScrollArea.Scrollbar
            className="ScrollAreaScrollbar"
            orientation="horizontal"
        >
            <ScrollArea.Thumb className="ScrollAreaThumb" />
        </ScrollArea.Scrollbar>

        <ScrollArea.Corner className="ScrollAreaCorner" />
    </ScrollArea.Root>

);