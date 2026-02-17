import React from 'react';
import { makeStyles } from '@material-ui/core';
import HomeIcon from '@material-ui/icons/Home';
import ExtensionIcon from '@material-ui/icons/Extension';
import LibraryBooks from '@material-ui/icons/LibraryBooks';
import CreateComponentIcon from '@material-ui/icons/AddCircleOutline';
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';
import GroupIcon from '@material-ui/icons/People';
import {
    Sidebar,
    sidebarConfig,
    SidebarDivider,
    SidebarGroup,
    SidebarItem,
    SidebarScrollWrapper,
    SidebarSpace,
    useSidebarOpenState,
    Link,
} from '@backstage/core-components';
import {
    Settings as SidebarSettings,
    UserSettingsSignInAvatar,
} from '@backstage/plugin-user-settings';
import { SidebarSearchModal } from '@backstage/plugin-search';
import { MyGroupsSidebarItem } from '@backstage/plugin-org';
import { NavContentBlueprint } from '@backstage/plugin-app-react';
import LogoFull from '../../../components/Root/LogoFull';
import LogoIcon from '../../../components/Root/LogoIcon';

const useSidebarLogoStyles = makeStyles({
    root: {
        width: sidebarConfig.drawerWidthClosed,
        height: 3 * sidebarConfig.logoHeight,
        display: 'flex',
        flexFlow: 'row nowrap',
        alignItems: 'center',
        marginBottom: -14,
    },
    link: {
        width: sidebarConfig.drawerWidthClosed,
        marginLeft: 24,
    },
});

const SidebarLogo = () => {
    const classes = useSidebarLogoStyles();
    const { isOpen } = useSidebarOpenState();

    return (
        <div className={classes.root}>
            <Link to="/" underline="none" className={classes.link} aria-label="Home">
                {isOpen ? <LogoFull /> : <LogoIcon />}
            </Link>
        </div>
    );
};

export const SidebarContent = NavContentBlueprint.make({
    params: {
        component: ({ items }) => (
            <Sidebar>
                <SidebarLogo />
                <SidebarGroup label="Search" icon={<SearchIcon />} to="/search">
                    <SidebarSearchModal />
                </SidebarGroup>
                <SidebarDivider />
                <SidebarGroup label="Menu" icon={<MenuIcon />}>
                    {/* Global nav, not org-specific */}
                    <SidebarItem icon={HomeIcon} to="catalog" text="Home" />
                    <MyGroupsSidebarItem
                        singularTitle="My Group"
                        pluralTitle="My Groups"
                        icon={GroupIcon}
                    />
                    <SidebarItem icon={ExtensionIcon} to="api-docs" text="APIs" />
                    <SidebarItem icon={LibraryBooks} to="docs" text="Docs" />
                    <SidebarItem icon={CreateComponentIcon} to="create" text="Create..." />
                    <SidebarItem
                        icon={CreateComponentIcon}
                        to="/scaffolder-studio"
                        text="Scaffolder Studio"
                    />
                    {/* End global nav */}
                    <SidebarDivider />
                    <SidebarScrollWrapper>
                        {/* Render plugin-provided nav items */}
                        {items.map((item, index) => (
                            <SidebarItem {...item} key={index} />
                        ))}
                    </SidebarScrollWrapper>
                </SidebarGroup>
                <SidebarSpace />
                <SidebarDivider />
                <SidebarGroup
                    label="Settings"
                    icon={<UserSettingsSignInAvatar />}
                    to="/settings"
                >
                    <SidebarSettings />
                </SidebarGroup>
            </Sidebar>
        ),
    },
});
