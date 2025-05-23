// src/utils/security.js
export async function verifyGitHubSignature(payload, signature, secret) {
  try {
    // payload is now passed as a string
    // signature is now passed directly
    
    if (!signature) {
      return false;
    }
    
    // The signature is in the format "sha256=..."
    const providedSignature = signature.slice(7); // Remove "sha256=" prefix
    
    // Create HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Sign the payload
    const msgUint8 = new TextEncoder().encode(payload);
    const expectedSignatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      msgUint8
    );
    
    // Convert to hex
    const expectedSignature = Array.from(new Uint8Array(expectedSignatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Constant-time comparison
    return timingSafeEqual(providedSignature, expectedSignature);
  } catch (error) {
    console.error('GitHub signature verification error:', error);
    return false;
  }
}

export async function verifyLinearSignature(payload, signature, secret) {
  try {
    // payload is now passed as a string
    // signature is now passed directly
    
    if (!signature) {
      return false;
    }
    
    // Create HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Sign the payload
    const msgUint8 = new TextEncoder().encode(payload);
    const expectedSignatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      msgUint8
    );
    
    // Convert to base64
    const expectedSignature = btoa(
      String.fromCharCode(...new Uint8Array(expectedSignatureBuffer))
    );
    
    // Constant-time comparison
    return timingSafeEqual(signature, expectedSignature);
  } catch (error) {
    console.error('Linear signature verification error:', error);
    return false;
  }
}

export async function verifySlackSignature(payload, timestamp, signature, secret) {
  try {
    // payload is now passed as a string
    
    if (!signature || !timestamp) {
      return false;
    }
    
    // Check timestamp is recent (within 5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
      return false; // Timestamp is too old
    }
    
    // Create the signature base string
    const baseString = `v0:${timestamp}:${payload}`;
    
    // Create HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Sign the base string
    const msgUint8 = new TextEncoder().encode(baseString);
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      msgUint8
    );
    
    // Convert to hex with v0= prefix
    const expectedSignature = 'v0=' + Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Constant-time comparison
    return timingSafeEqual(signature, expectedSignature);
  } catch (error) {
    console.error('Slack signature verification error:', error);
    return false;
  }
}

// Constant-time string comparison to prevent timing attacks
function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}