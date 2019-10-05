export const proofQuery = address => `
{
  profile(id: "${address}") {
    proof_github
    proof_twitter
  }
}
`
