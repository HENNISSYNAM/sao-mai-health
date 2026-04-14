export async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

export function buildMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return ''
  if (leaves.length === 1) return leaves[0]
  
  const nextLevel: string[] = []
  for (let i = 0; i < leaves.length; i += 2) {
    const left = leaves[i]
    const right = i + 1 < leaves.length ? leaves[i + 1] : left
    // Simple concatenation hash for demo
    nextLevel.push(btoa(left + right))
  }
  
  return buildMerkleRoot(nextLevel)
}

export async function signRoot(merkleRoot: string): Promise<string> {
  // Mock signature for demo - in production use proper Ed25519
  const encoder = new TextEncoder()
  const data = encoder.encode(merkleRoot + Date.now())
  const signature = await crypto.subtle.digest('SHA-256', data)
  const signatureArray = Array.from(new Uint8Array(signature))
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('')
}