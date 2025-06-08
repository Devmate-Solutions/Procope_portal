import { Configuration, PublicClientApplication, LogLevel, IPublicClientApplication } from '@azure/msal-browser';

// Detailed configuration logging function
const logConfiguration = (config: Configuration) => {
  console.group('🔍 MSAL Configuration Details');
  console.log('Client ID:', config.auth?.clientId);
  console.log('Authority:', config.auth?.authority);
  console.log('Redirect URI:', config.auth?.redirectUri);
  console.log('Cache Location:', config.cache?.cacheLocation);
  console.log('Store Auth State in Cookie:', config.cache?.storeAuthStateInCookie);
  console.groupEnd();
};

// Configuration optimized for single-tenant Azure AD SPA
export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || '014938cc-e38f-4f9f-b0c5-1d38e434be4a',
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID || '175a6d05-4623-4487-809d-968f04204af2'}`,
    redirectUri: process.env.NEXT_PUBLIC_AZURE_AD_REDIRECT_URI || 'https://mydent.vercel.app/login',
    postLogoutRedirectUri: '/'
  },
  cache: {
    cacheLocation: 'sessionStorage', // Changed from localStorage for better security
    storeAuthStateInCookie: false // Recommended for modern browsers
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error('🔴 MSAL Auth Error:', message);
            break;
          case LogLevel.Warning:
            console.warn('🟠 MSAL Auth Warning:', message);
            break;
          case LogLevel.Info:
            console.log('🔵 MSAL Auth Info:', message);
            break;
          case LogLevel.Verbose:
            console.debug('🟣 MSAL Auth Verbose:', message);
            break;
        }
      },
      logLevel: LogLevel.Verbose, // Increased verbosity for debugging
    }
  }
};

// Log configuration details
logConfiguration(msalConfig);

// Create MSAL instance
export const msalInstance: IPublicClientApplication = new PublicClientApplication(msalConfig);

// Initialize MSAL instance with comprehensive error handling
export const initializeMsal = async (): Promise<IPublicClientApplication> => {
  try {
    console.log('🚀 Initializing MSAL for SPA...');
    
    // Validate critical configuration
    if (!msalConfig.auth.clientId) {
      throw new Error('❌ Azure AD Client ID is missing');
    }
    
    if (!msalConfig.auth.authority) {
      throw new Error('❌ Azure AD Authority is missing');
    }
    
    if (!msalConfig.auth.redirectUri) {
      throw new Error('❌ Redirect URI is missing');
    }

    await msalInstance.initialize();
    console.log('✅ MSAL initialized successfully for SPA');
    return msalInstance;
  } catch (error) {
    console.error('❌ MSAL Initialization Error:', error);
    
    // Provide more context about potential issues
    if (error instanceof Error) {
      console.error('Error Details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    throw error;
  }
};

// Login request for single-tenant organizational access
export const loginRequest = {
  scopes: [
    'openid',     // Standard authentication scope
    'profile',    // Basic profile information
    'email'       // Email address access
  ],
  prompt: 'select_account' // Force account selection
}; 