// Using the native CompressionStream API for modern browsers
export async function compressContent(content: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const encodedContent = encoder.encode(content);
    
    // Create a compression stream
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    const reader = cs.readable.getReader();
    
    // Write the content
    await writer.write(encodedContent);
    await writer.close();
    
    // Read the compressed content
    const chunks = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    // Combine chunks and encode as base64
    const compressedContent = btoa(
      chunks.reduce((acc, chunk) => acc + String.fromCharCode(...chunk), '')
    );
    
    return compressedContent;
  } catch (error) {
    console.warn('Compression not supported, falling back to original content');
    return content;
  }
}

export async function decompressContent(compressedContent: string): Promise<string> {
  try {
    // Decode base64
    const binaryContent = atob(compressedContent);
    const compressedData = new Uint8Array(binaryContent.length);
    for (let i = 0; i < binaryContent.length; i++) {
      compressedData[i] = binaryContent.charCodeAt(i);
    }
    
    // Create a decompression stream
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();
    
    // Write the compressed content
    await writer.write(compressedData);
    await writer.close();
    
    // Read the decompressed content
    const chunks = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    // Combine chunks and decode
    const decoder = new TextDecoder();
    return decoder.decode(
      new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []))
    );
  } catch (error) {
    console.warn('Decompression failed, returning original content');
    return compressedContent;
  }
}

// Fallback compression using basic RLE for unsupported browsers
function fallbackCompress(content: string): string {
  let compressed = '';
  let count = 1;
  let current = content[0];
  
  for (let i = 1; i <= content.length; i++) {
    if (i === content.length || content[i] !== current) {
      compressed += (count > 1 ? count : '') + current;
      count = 1;
      current = content[i];
    } else {
      count++;
    }
  }
  
  return compressed.length < content.length ? compressed : content;
}

// Helper to check if content is compressed
export function isCompressed(content: string): boolean {
  try {
    return typeof content === 'string' && !!atob(content);
  } catch {
    return false;
  }
}