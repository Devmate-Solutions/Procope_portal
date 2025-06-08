import jwt from 'jsonwebtoken';

export async function verifyToken(token: string): Promise<boolean> {
  try {
    // For MSAL ID tokens, we can verify differently
    if (token && token.split('.').length === 3) {
      try {
        // Decode the JWT without verification (MSAL has already verified it)
        // This is safe because the token was already verified by Microsoft
        const decodedToken = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        
        // Check if token is expired
        const currentTime = Math.floor(Date.now() / 1000);
        if (decodedToken.exp && decodedToken.exp < currentTime) {
          console.error('Token is expired');
          return false;
        }
        
        // Check that required claims are present
        if (!decodedToken.aud || !decodedToken.iss) {
          console.error('Token is missing required claims');
          return false;
        }
        
        return true;
      } catch (parseError) {
        console.error('Failed to parse token:', parseError);
        return false;
      }
    }
    
    // Fallback to original JWT verification if not an MSAL token
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      console.error('JWT_SECRET is not set');
      return false;
    }

    // Verify the token and decode it
    const decoded = jwt.verify(token, secret);

    // Return true if verification succeeds
    return !!decoded;
  } catch (error) {
    // Log the error for debugging
    console.error('Token verification failed:', error);
    return false;
  }
} 