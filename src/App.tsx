//src/App.tsx
import { Provider } from 'react-redux';
import { store } from './store';
import { ChainSection } from './components/chain/ChainSection';
import { ValidatorOverview } from './components/validator/ValidatorOverview';

function App() {
  return (
    <Provider store={store}>
      <div className="min-h-screen bg-gray-100 p-8">
        <h1 className="text-3xl font-bold mb-8">Find Better Friends</h1>
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <ChainSection />
          </div>
          <ValidatorOverview />
        </div>
      </div>
    </Provider>
  );
}

export default App;