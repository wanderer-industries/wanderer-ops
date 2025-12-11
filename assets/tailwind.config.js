// See the Tailwind configuration guide for advanced usage
// https://tailwindcss.com/docs/configuration

const plugin = require('tailwindcss/plugin');
const fs = require('fs');
const path = require('path');

module.exports = {
  important: '.wanderer_ops-web',
  content: [
    './js/**/*.js',
    '../lib/wanderer_ops.ex',
    '../lib/wanderer_ops/**/*.*ex',
    '../lib/wanderer_ops_web/**/**/*.*ex',
    '../lib/wanderer_ops_web/**/**/**/*.*ex',
    './react/**/*.{jsx,ts,tsx}',
    './stories/**/*.{jsx,ts,tsx,mdx}',
    './react/components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: '#FD4F00',
        customBlue: '#4951BE',
        brightBlue: '#0038FF',
        // Cyber security theme colors
        cyber: {
          primary: '#00f0ff',
          secondary: '#0a84ff',
          accent: '#00ff88',
          warning: '#ff6b35',
          danger: '#ff3366',
          dark: {
            900: '#0a0e17',
            800: '#0d1321',
            700: '#131a2b',
            600: '#1a2338',
            500: '#212d45',
          },
          glow: {
            cyan: 'rgba(0, 240, 255, 0.15)',
            blue: 'rgba(10, 132, 255, 0.15)',
            green: 'rgba(0, 255, 136, 0.15)',
          }
        },
      },
      boxShadow: {
        'cyber': '0 0 20px rgba(0, 240, 255, 0.3), 0 0 40px rgba(0, 240, 255, 0.1)',
        'cyber-sm': '0 0 10px rgba(0, 240, 255, 0.2)',
        'cyber-inner': 'inset 0 0 20px rgba(0, 240, 255, 0.1)',
        'cyber-glow': '0 0 30px rgba(0, 240, 255, 0.4), 0 0 60px rgba(0, 240, 255, 0.2), 0 0 100px rgba(0, 240, 255, 0.1)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'scan-line': 'scan-line 3s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'border-flow': 'border-flow 3s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'border-flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      backgroundImage: {
        'cyber-grid': 'linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)',
        'cyber-gradient': 'linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(10, 132, 255, 0.05) 50%, rgba(0, 255, 136, 0.1) 100%)',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/forms'),
    // Allows prefixing tailwind classes with LiveView classes to add rules
    // only when LiveView classes are applied, for example:
    //
    //     <div class="phx-click-loading:animate-ping">
    //
    plugin(({ addVariant }) => addVariant('phx-click-loading', ['.phx-click-loading&', '.phx-click-loading &'])),
    plugin(({ addVariant }) => addVariant('phx-submit-loading', ['.phx-submit-loading&', '.phx-submit-loading &'])),
    plugin(({ addVariant }) => addVariant('phx-change-loading', ['.phx-change-loading&', '.phx-change-loading &'])),

    // Embeds Heroicons (https://heroicons.com) into your app.css bundle
    // See your `CoreComponents.icon/1` for more information.
    //
    plugin(function ({ matchComponents, theme }) {
      let iconsDir = path.join(__dirname, '../deps/heroicons/optimized');
      let values = {};
      let icons = [
        ['', '/24/outline'],
        ['-solid', '/24/solid'],
        ['-mini', '/20/solid'],
        ['-micro', '/16/solid'],
      ];
      icons.forEach(([suffix, dir]) => {
        fs.readdirSync(path.join(iconsDir, dir)).forEach(file => {
          let name = path.basename(file, '.svg') + suffix;
          values[name] = { name, fullPath: path.join(iconsDir, dir, file) };
        });
      });
      matchComponents(
        {
          hero: ({ name, fullPath }) => {
            let content = fs
              .readFileSync(fullPath)
              .toString()
              .replace(/\r?\n|\r/g, '');
            let size = theme('spacing.6');
            if (name.endsWith('-mini')) {
              size = theme('spacing.5');
            } else if (name.endsWith('-micro')) {
              size = theme('spacing.4');
            }
            return {
              [`--hero-${name}`]: `url('data:image/svg+xml;utf8,${content}')`,
              '-webkit-mask': `var(--hero-${name})`,
              mask: `var(--hero-${name})`,
              'mask-repeat': 'no-repeat',
              'background-color': 'currentColor',
              'vertical-align': 'middle',
              display: 'inline-block',
              width: size,
              height: size,
            };
          },
        },
        { values },
      );
    }),
  ],
};
