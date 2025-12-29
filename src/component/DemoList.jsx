import * as ScrollArea from '@radix-ui/react-scroll-area';
import demos from '../demolist';
import './styles.css';
import * as Tabs from '@radix-ui/react-tabs';
import { Flex } from '@radix-ui/themes';

const Content = (props) => {

    const gltype = props.gltype;
    const demos = props.demos;

    return (
        <>
            {demos.map((d) => (
                <div className="DemoOption" key={d.name} onClick={() => {
                    const frame = document.getElementById('demo-frame');
                    frame.setAttribute('src', `./${gltype}-${d.name}.html`);
                }}>
                    <div className='DemoOptionDescribe'>{d.name}: {d.describe}</div>
                </div>
            ))}
        </>
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
            <Flex direction="column" style={{ height: "95vh" }}>
                <SingleDemoList demos={demos.webglDemos} gltype="webgl"></SingleDemoList>
            </Flex>
        </Tabs.Content>
        <Tabs.Content className="TabsContent" value="tab2">
            <Flex direction="column" style={{ height: "95vh" }}>
                <SingleDemoList demos={demos.webgpuDemos} gltype="webgpu"></SingleDemoList>
            </Flex>
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