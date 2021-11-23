import 'regenerator-runtime/runtime'
import React from 'react'
import { login, logout } from './utils'
import './global.css'
import Big from 'big.js';
import getConfig from './config'
import axios from 'axios'
import queryString from 'query-string';
const { networkId } = getConfig(process.env.NODE_ENV || 'development')
const near_storage = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDczMmJDYzgxNTIyQjYyNjU2OWY3QzMzMDUyZWUxZENDM0VDNTNCY0UiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTYzNzU5NTA3NTI4NiwibmFtZSI6Im5lYXIifQ.5KERBHWxlWTI7l3AnUTONYGsydobjwzZSEa3SIRTEMw'
const nft_storage_api = 'https://api.nft.storage'
const BOATLOAD_OF_GAS = Big(3).times(10 ** 14).toFixed();
const DEPOSIT_OF_GAS = Big(70).times(10 ** 18).toFixed();

export default function App() {
  // use React Hooks to store greeting in component state
  const [greeting, set_greeting] = React.useState()

  // when the user has not yet interacted with the form, disable the button
  const [buttonDisabled, setButtonDisabled] = React.useState(true)

  // after submitting the form, we want to show Notification
  const [showNotification, setShowNotification] = React.useState(false)

  // The useEffect hook can be used to fire side-effects during render
  // Learn more: https://reactjs.org/docs/hooks-intro.html
  React.useEffect(
    () => {
      // in this case, we only care to query the contract when signed in
      if (window.walletConnection.isSignedIn()) {
        const hash = queryString.parse(window.location.search, { ignoreQueryPrefix: true }).transactionHashes
        if(hash) {
          setShowNotification(true);
        }
      }
    },

    // The second argument to useEffect tells React when to re-run the effect
    // Use an empty array to specify "only run on first render"
    // This works because signing into NEAR Wallet reloads the page
    []
  )

  // if not signed in, return early with sign-in prompt
  if (!window.walletConnection.isSignedIn()) {
    return (
      <main>
        <h1>NEAR NFT App</h1>
        <p>
          This app lets you mint your own NFT on NEAR and nft.storage
        </p>
        <p style={{ textAlign: 'center', marginTop: '2.5em' }}>
          <button onClick={login}>Sign in</button>
        </p>
      </main>
    )
  }

  return (
    // use React Fragment, <>, to avoid wrapping elements in unnecessary divs
    <>
      <button className="link" style={{ float: 'right' }} onClick={logout}>
        Sign out [{window.accountId}]
      </button>
      <main>
        <h1>
          <label
            htmlFor="greeting"
            style={{
              color: 'var(--secondary)',
              borderBottom: '2px solid var(--secondary)'
            }}
          >
          </label>
        </h1>
        <form onSubmit={async event => {
          event.preventDefault()

          // get elements from the form using their id attribute
          const { fieldset, titleInput, greeting } = event.target.elements

          // hold onto new user-entered value from React's SynthenticEvent for use after `await` call
          const newGreeting = greeting.value
          console.log(newGreeting)

          // disable the form while the value gets updated on-chain
          fieldset.disabled = true

          try {
            var reader  = new FileReader();
            reader.onloadend = async function () {
              const post = await axios.post(`${nft_storage_api}/upload`, reader.result, 
                {
                  headers: {'Authorization': `Bearer ${near_storage}`}
                })
              console.log(post);

              window.contract.nft_mint(
                { 
                  receiver_id: window.accountId,
                  token_id: `${Math.floor(Math.random() * 10)}`, 
                  metadata: {
                    title: titleInput.value,
                    media: `https://${post.data.value.cid}.ipfs.dweb.link/`,
                    copies: 1
                  }
                }, '100000000000000', '10000000000000000000000')
              .then(greetingFromContract => {
                console.log(greetingFromContract)
                // show Notification
                setShowNotification(true)

                // remove Notification again after css animation completes
                // this allows it to be shown again next time the form is submitted
                setTimeout(() => {
                  setShowNotification(false)
                }, 11000)
              })
            }
            reader.readAsArrayBuffer(greeting.files[0]);

          } catch (e) {
            alert(
              'Something went wrong! ' +
              'Maybe you need to sign out and back in? ' +
              'Check your browser console for more info.'
            )
            throw e
          } finally {
            // re-enable the form, whether the call succeeded or failed
            fieldset.disabled = false
          }

        }}>
          <fieldset id="fieldset">
            <label
              htmlFor="titleInput"
              style={{
                display: 'block',
                color: 'var(--gray)',
                marginBottom: '0.5em'
              }}
            >
              NFT Title:
            </label>
            <input
                autoComplete="off"
                id="titleInput"
                style={{ flex: 1 }}
              />
            <label
              htmlFor="greeting"
              style={{
                display: 'block',
                color: 'var(--gray)',
                marginBottom: '0.5em'
              }}
            >
              Select an image:
            </label>
            <div style={{ display: 'flex' }}>
              <input
                type="file"
                autoComplete="off"
                defaultValue={greeting}
                id="greeting"
                onChange={e => setButtonDisabled(e.target.value === greeting)}
                style={{ flex: 1 }}
              />
              <button
                disabled={buttonDisabled}
                style={{ borderRadius: '0 5px 5px 0' }}
              >
                Mint NFT
              </button>
            </div>
          </fieldset>
        </form>
      </main>
      {showNotification && <Notification />}
    </>
  )
}

// this component gets rendered by App after the form is submitted
function Notification() {
  const urlPrefix = `https://explorer.${networkId}.near.org/accounts`
  return (
    <aside>
      <a target="_blank" rel="noreferrer" href={`${urlPrefix}/${window.accountId}`}>
        {window.accountId}
      </a>
      {' '/* React trims whitespace around tags; insert literal space character when needed */}
      called method: 'nft_mint' in contract:
      {' '}
      <a target="_blank" rel="noreferrer" href={`${urlPrefix}/${window.contract.contractId}`}>
        {window.contract.contractId}
      </a>
      <footer>
        <div>✔ Succeeded</div>
        <div>Just now</div>
      </footer>
    </aside>
  )
}
