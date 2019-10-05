import http from 'http'
import { env, mongo, port, ip, apiRoot } from './config'
import mongoose from './services/mongoose'
import express from './services/express'
import api from './api'
import bodyParser from'body-parser'
import Box from '3box'
import IdentityWallet from 'identity-wallet'
import { ethers } from 'ethers'

import { verifyDIDConnection } from './services'
import { isAddress } from './utils'

/* --------------- */
/* Express
/* Initialize server to manage DID related queries.
/* --------------- */
const app = express(apiRoot, api)
const server = http.createServer(app)
const urlencodedParser = bodyParser.urlencoded({ extended: false })

mongoose.connect(mongo.uri)
mongoose.Promise = Promise

/**
 * @function referral
 * @description Validate a connection between two decentralized identities verified with Github.
 */
app.post('/referral', urlencodedParser, async function (req, res) {

  // Form Inputs require two valid Ethereum address.
  // 1. An original referrer (referal link activated)
  // 2. The current referee (submitting inputs)
  const referrer = req.body.referrer
  const referee = req.body.referee

  // IF inputs are not valid ethereum address FALSE return a 500 response.
  if (!isAddress(referrer) || !isAddress(referee)) return res.sendStatus(500)

  /**
   * @name ServerDIDInit
   * @description Initialize the server identity.
   * @todo Waiting for solution from 3Box team.
   * @bug UnhandledPromiseRejectionWarning: ReferenceError: window is not defined
   */
  const ServerDIDInit = () => {
    let box

    /* --------------- */
    /* Initialize Identity Wallet
    /* A new identity walley is initialied to issue claims.
    /* --------------- */
    const seed = process.env.PRIVATE_KEY
    const wallet = new IdentityWallet({ seed })
    const DID = 'did:muport:ADD_DID_INFO'

    /* --------------- */
    /* Initialize Box Storage
    /* Connect to the server DID storage and messaging.
    /* --------------- */
    // let provider = await ethers.getDefaultProvider()
    // const BoxServer = await Box.openBox(idWallet, provider)
    // console.log(BoxServer)

    return {
      box,
      DID,
      wallet
    }
  }
  const serverDID = ServerDIDInit()

  const verifiedReferrer = await Box.getVerifiedAccounts(await Box.getProfile(referrer))
  const verifiedReferee = await Box.getVerifiedAccounts(await Box.getProfile(referee))

  /* --------------- */
  /**
   * Verify DID Connection
  /* @todo Verify account create date.
  /* @todo Anything we need to store in database? Or everything IPFS/Threads?
  /* --------------- */
  const isNewConnection = verifyDIDConnection(
    verifiedReferrer.github.username,
    verifiedReferee.github.username
  )

  // IF : new connection is FALSE return a 500 response.
  if (!isNewConnection) return res.send(500)

  // ELSE : Generate a verifiable credential for both referrer and referee.
  const claimPayloadReferrer = (referrer) => ({
    referrer
  })
  const claimPayloadReferee = (referrer) => ({
    referrer
  })
  const claimConfig = {
    DID: WALLET_DID
  }

  const connectionClaimReferrer = await serverDID.wallet.signClaim(claimPayloadReferrer(referee), claimConfig)
  const connectionClaimReferee = await serverDID.wallet.signClaim(claimPayloadReferee(referrer), claimConfig)

  /**
   * @function send
   * @description
   * Send the referee the signed claim of a valid connection.
   * The user can submit claim to Token issuing service to collect
   * tokens as a reward.
   */
  res.send(connectionClaimReferee)
})

/* --- Developer --- */
setImmediate(() => {
  server.listen(port, ip, () => {
    if (process.env.MODE === 'DEV') {
      console.log('Express server listening on http://%s:%d, in %s mode', ip, port, env)
    }
  })
})

export default app
