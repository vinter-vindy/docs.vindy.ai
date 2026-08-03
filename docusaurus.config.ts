import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Vindy API Docs',
  tagline: 'Vindy AI Voice Assistant Platform',
  favicon: 'img/favicon.ico',
  // Domain is pending final confirmation — update url when DNS is settled.
  url: 'https://docs.vindy.vinter.me',
  baseUrl: '/',
  organizationName: 'vindy',
  projectName: 'vindy-docs',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'tr'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          lastVersion: 'current',
          versions: {
            current: {
              label: 'v1.0.x',
            },
          },
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/vindy-logo.svg',
    navbar: {
      title: 'Vindy Docs',
      logo: {
        alt: 'Vindy AI Voice Assistant Platform',
        src: 'img/vindy-logo.svg',
        srcDark: 'img/vindy-logo-white.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Overview',
              to: '/docs/overview',
            },
            {
              label: 'Quickstart',
              to: '/docs/quickstart',
            },
            {
              label: 'Authentication',
              to: '/docs/authentication',
            },
            {
              label: 'API Reference',
              to: '/docs/category/api-reference',
            },
          ],
        },
        {
          title: 'Guides',
          items: [
            {
              label: 'Concepts',
              to: '/docs/category/concepts',
            },
            {
              label: 'Cookbook',
              to: '/docs/category/guides',
            },
            {
              label: 'Error Codes',
              to: '/docs/errors',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'FAQ',
              to: '/docs/faq',
            },
            {
              label: 'Glossary',
              to: '/docs/glossary',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Vindy. All rights reserved`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
