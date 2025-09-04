// polyfill recommended by Vite https://vitejs.dev/config/build-options#build-modulepreload
import 'vite/modulepreload-polyfill';

import '../css/app.css';
import '../css/variables.css';

import { Dashboard } from '@features/dashboard';

export default {
  Dashboard,
};
