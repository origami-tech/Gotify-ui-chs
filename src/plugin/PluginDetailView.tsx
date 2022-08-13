import React, {Component} from 'react';
import {RouteComponentProps} from 'react-router';
import {Markdown} from '../common/Markdown';
import {UnControlled as CodeMirror} from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/yaml/yaml';
import Info from '@material-ui/icons/Info';
import Build from '@material-ui/icons/Build';
import Subject from '@material-ui/icons/Subject';
import Refresh from '@material-ui/icons/Refresh';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import DefaultPage from '../common/DefaultPage';
import * as config from '../config';
import Container from '../common/Container';
import {inject, Stores} from '../inject';
import {IPlugin} from '../types';

type IProps = RouteComponentProps<{id: string}>;

interface IState {
    displayText: string | null;
    currentConfig: string | null;
}

class PluginDetailView extends Component<IProps & Stores<'pluginStore'>, IState> {
    private pluginID: number = parseInt(this.props.match.params.id, 10);
    private pluginInfo = () => this.props.pluginStore.getByID(this.pluginID);

    public state: IState = {
        displayText: null,
        currentConfig: null,
    };

    public componentWillMount() {
        this.refreshFeatures();
    }

    public componentWillReceiveProps(nextProps: IProps & Stores<'pluginStore'>) {
        this.pluginID = parseInt(nextProps.match.params.id, 10);
        this.refreshFeatures();
    }

    private refreshFeatures() {
        return Promise.all([this.refreshConfigurer(), this.refreshDisplayer()]);
    }

    private async refreshConfigurer() {
        const {
            props: {pluginStore},
        } = this;
        if (this.pluginInfo().capabilities.indexOf('configurer') !== -1) {
            const response = await pluginStore.requestConfig(this.pluginID);
            this.setState({currentConfig: response});
        }
    }

    private async refreshDisplayer() {
        const {
            props: {pluginStore},
        } = this;
        if (this.pluginInfo().capabilities.indexOf('displayer') !== -1) {
            const response = await pluginStore.requestDisplay(this.pluginID);
            this.setState({displayText: response});
        }
    }

    public render() {
        const pluginInfo = this.pluginInfo();
        const {name, capabilities} = pluginInfo;
        return (
            <DefaultPage title={name} maxWidth={1000}>
                <PanelWrapper name={'插件信息'} icon={Info}>
                    <PluginInfo pluginInfo={pluginInfo} />
                </PanelWrapper>
                {capabilities.indexOf('configurer') !== -1 ? (
                    <PanelWrapper
                        name={'Configurer'}
                        description={'This is the configuration panel for this plugin.'}
                        icon={Build}
                        refresh={this.refreshConfigurer.bind(this)}
                    >
                        <ConfigurerPanel
                            pluginInfo={pluginInfo}
                            initialConfig={
                                this.state.currentConfig !== null
                                    ? this.state.currentConfig
                                    : 'Loading...'
                            }
                            save={async (newConfig) => {
                                await this.props.pluginStore.changeConfig(this.pluginID, newConfig);
                                await this.refreshFeatures();
                            }}
                        />
                    </PanelWrapper>
                ) : null}{' '}
                {capabilities.indexOf('displayer') !== -1 ? (
                    <PanelWrapper
                        name={'Displayer'}
                        description={'这是插件生成的信息'}
                        refresh={this.refreshDisplayer.bind(this)}
                        icon={Subject}
                    >
                        <DisplayerPanel
                            pluginInfo={pluginInfo}
                            displayText={
                                this.state.displayText !== null
                                    ? this.state.displayText
                                    : 'Loading...'
                            }
                        />
                    </PanelWrapper>
                ) : null}
            </DefaultPage>
        );
    }
}

interface IPanelWrapperProps {
    name: string;
    description?: string;
    refresh?: () => Promise<void>;
    icon?: React.ComponentType;
}

const PanelWrapper: React.FC<IPanelWrapperProps> = ({
    name,
    description,
    refresh,
    icon,
    children,
}) => {
    const Icon = icon;
    return (
        <Container style={{display: 'block', width: '100%', margin: '20px'}}>
            <Typography variant="h5">
                {Icon ? (
                    <span>
                        <Icon />
                        &nbsp;
                    </span>
                ) : null}
                {name}
                {refresh ? (
                    <Button
                        style={{float: 'right'}}
                        onClick={() => {
                            refresh();
                        }}
                    >
                        <Refresh />
                    </Button>
                ) : null}
            </Typography>
            {description ? <Typography variant="subtitle1">{description}</Typography> : null}
            <hr />
            <div className={name.toLowerCase().trim().replace(/ /g, '-')}>{children}</div>
        </Container>
    );
};

interface IConfigurerPanelProps {
    pluginInfo: IPlugin;
    initialConfig: string;
    save: (newConfig: string) => Promise<void>;
}
class ConfigurerPanel extends Component<IConfigurerPanelProps, {unsavedChanges: string | null}> {
    public state = {unsavedChanges: null};

    public render() {
        return (
            <div>
                <CodeMirror
                    value={this.props.initialConfig}
                    options={{
                        mode: 'yaml',
                        theme: 'material',
                        lineNumbers: true,
                    }}
                    onChange={(_, _1, value) => {
                        let newConf: string | null = value;
                        if (value === this.props.initialConfig) {
                            newConf = null;
                        }
                        this.setState({unsavedChanges: newConf});
                    }}
                />
                <br />
                <Button
                    variant="contained"
                    color="primary"
                    fullWidth={true}
                    disabled={
                        this.state.unsavedChanges === null ||
                        this.state.unsavedChanges === this.props.initialConfig
                    }
                    className="config-save"
                    onClick={() => {
                        const newConfig = this.state.unsavedChanges;
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        this.props.save(newConfig!).then(() => {
                            this.setState({unsavedChanges: null});
                        });
                    }}
                >
                    <Typography variant="button">保存</Typography>
                </Button>
            </div>
        );
    }
}

interface IDisplayerPanelProps {
    pluginInfo: IPlugin;
    displayText: string;
}
const DisplayerPanel: React.FC<IDisplayerPanelProps> = ({displayText}) => (
    <Typography variant="body2">
        <Markdown>{displayText}</Markdown>
    </Typography>
);

class PluginInfo extends Component<{pluginInfo: IPlugin}> {
    public render() {
        const {
            props: {
                pluginInfo: {name, author, modulePath, website, license, capabilities, id, token},
            },
        } = this;
        return (
            <div>
                {name ? (
                    <Typography variant="body2" className="name">
                        名称: <span>{name}</span>
                    </Typography>
                ) : null}
                {author ? (
                    <Typography variant="body2" className="author">
                        作者: <span>{author}</span>
                    </Typography>
                ) : null}
                <Typography variant="body2" className="module-path">
                    模块路径: <span>{modulePath}</span>
                </Typography>
                {website ? (
                    <Typography variant="body2" className="website">
                        网站: <span>{website}</span>
                    </Typography>
                ) : null}
                {license ? (
                    <Typography variant="body2" className="license">
                        许可证: <span>{license}</span>
                    </Typography>
                ) : null}
                <Typography variant="body2" className="capabilities">
                    能力: <span>{capabilities.join(', ')}</span>
                </Typography>
                {capabilities.indexOf('webhooker') !== -1 ? (
                    <Typography variant="body2">
                        自定义路由前缀:{' '}
                        {((url) => (
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="custom-route"
                            >
                                {url}
                            </a>
                        ))(`${config.get('url')}plugin/${id}/custom/${token}/`)}
                    </Typography>
                ) : null}
            </div>
        );
    }
}

export default inject('pluginStore')(PluginDetailView);
