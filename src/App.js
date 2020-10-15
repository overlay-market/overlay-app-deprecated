import React, { Component } from 'react';
import {
  Accordion,
  Button,
  ButtonGroup,
  ButtonToolbar,
  Card,
  Container,
  Dropdown,
  DropdownButton,
  Form,
  FormControl,
  InputGroup,
  Modal,
  Navbar,
  Spinner,
  ToggleButtonGroup,
  ToggleButton,
} from 'react-bootstrap';
import Eth from 'web3-eth';
import TradingViewWidget, { BarStyles } from 'react-tradingview-widget';
import * as firebase from "firebase/app";
import "firebase/firestore";
import "firebase/functions";
import Numeral from 'numeral';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faSync } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import bannerSrc from './banner.png';
import metaMaskSrc from './metamask.svg';
import constants from './constants';
import './App.css';
import config from './config';

library.add(faSync);

class App extends Component {
  constructor(props, context) {
    super(props, context);

    // Function bindings
    this.handleShow = this.handleShow.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleFeedChange = this.handleFeedChange.bind(this);
    this.submitInviteCode = this.submitInviteCode.bind(this);
    this.addFunds = this.addFunds.bind(this);
    this.getQuote = this.getQuote.bind(this);
    this.executeTrade = this.executeTrade.bind(this);

    this.state = {
      total: {},
      account: null,
      positions: null,
      balance: null,
      tokenAddress: '0x74a653d735f79c1d7c817023c8740465a8be43a6',
      feeds: {
        'COINBASE-BTCUSD': {
          name: 'BTC / USD',
          symbol: 'COINBASE-BTCUSD',
          chartSymbol: 'COINBASE:BTCUSD',
          price: '',
          decimals: 8,
          feedAddress: '0x8024a34755eE778387049738E6f8d8DB634C33aA',
          feedABIType: 'ovlChainlinkFeedABI',
          feedDataSourceAddress: '0xECe365B379E1dD183B20fc5f022230C044d51404',
          marketAddress: '0x999403f37765ee7d5bfb1032e23d8b9241fdac72',
          denom: 'USD',
        },
        'COINBASE-ETHUSD': {
          name: 'ETH / USD',
          symbol: 'COINBASE-ETHUSD',
          chartSymbol: 'COINBASE:ETHUSD',
          price: '',
          decimals: 8,
          feedAddress: '',
          feedABIType: 'ovlChainlinkFeedABI',
          feedDataSourceAddress: '',
          marketAddress: '',
          denom: 'USD',
        },
        'CHAINLINK-FASTGAS': {
          name: 'Fast Gas / Gwei',
          symbol: 'CHAINLINK-FASTGAS',
          chartSymbol: 'CHAINLINK:FASTGAS',
          price: '',
          decimals: 8,
          feedAddress: '',
          feedABIType: 'ovlChainlinkFeedABI',
          feedDataSourceAddress: '',
          marketAddress: '',
          denom: 'ETH',
        },
        'UNISWAP-WBTCWETH': {
          name: 'Wrapped BTC / ETH',
          symbol: 'UNISWAP-WBTCWETH',
          chartSymbol: 'UNISWAP:WBTCWETH',
          price: '',
          decimals: 0,
          feedAddress: '',
          feedABIType: 'ovlUniswapV2FeedABI',
          feedDataSourceAddress: '',
          marketAddress: '',
          denom: 'ETH',
        },
        'UNISWAP-WETHUSDT': {
          name: 'ETH / USDT',
          symbol: 'UNISWAP-WETHUSDT',
          chartSymbol: 'UNISWAP:WETHUSDT',
          price: '',
          decimals: 0,
          feedAddress: '',
          feedABIType: 'ovlUniswapV2FeedABI',
          feedDataSourceAddress: '',
          marketAddress: '',
          denom: 'USD',
        },
        'UNISWAP-OVLETH': {
          name: 'OVL / ETH',
          symbol: 'UNISWAP-OVLETH',
          chartSymbol: 'UNISWAP:OVLWETH',
          price: '',
          decimals: 0,
          feedAddress: '',
          feedABIType: 'ovlUniswapV2FeedABI',
          feedDataSourceAddress: '',
          marketAddress: '',
          denom: 'ETH',
        }
      },
      inviteCode: '',
      feed: {
        name: 'BTC / USD',
        symbol: 'COINBASE-BTCUSD',
        chartSymbol: 'COINBASE:BTCUSD',
        price: '',
        decimals: 8,
        feedAddress: '0x8024a34755eE778387049738E6f8d8DB634C33aA',
        feedABIType: 'ovlChainlinkFeedABI',
        feedDataSourceAddress: '0xECe365B379E1dD183B20fc5f022230C044d51404',
        marketAddress: '0x999403f37765ee7d5bfb1032e23d8b9241fdac72',
        denom: 'USD',
      },
      show: false,
      loadingPrice: false,
      loadingFunds: false,
      loadingTrade: false,
      side: 1,
      amount: '',
      leverage: 1,
    };
  }

  handleClose() {
    this.setState({ show: false, side: 1, amount: '', leverage: 1 });
  }

  handleShow() {
    this.setState({ show: true });
  }

  async handleFeedChange(e) {
    const { feeds } = this.state;
    await this.setState({ feed: feeds[e.target.value] });
    await this.initializeFeed();
  }

  submitInviteCode = async () => {
    const { account, inviteCode } = this.state;
    try {
      // Fund a new account w OVL
      var balance = (await firebase.functions().httpsCallable('fundAccount')({ account, inviteCode })).data;
      this.setState({ balance });

      // Refresh the total stats
      await this.initializeTotalStats();
    } catch (err) {
      console.error(err);
      alert('Not able to fund your account');
    }
  }

  addFunds = async () => {
    const { account } = this.state;
    try {
      // Mark as loading
      this.setState({ loadingFunds: true });

      // Fund a new account w OVL
      var balance = (await firebase.functions().httpsCallable('fundAccount')({ account })).data;
      this.setState({ balance, loadingFunds: false });

      // Refresh the total stats
      await this.initializeTotalStats();
    } catch (err) {
      console.error(err);
      this.setState({ loadingFunds: false });
      alert('Not able to fund your account');
    }
  }

  getQuote = async () => {
    const { feeds, feed } = this.state;
    try {
      // Mark as loading
      this.setState({ loadingPrice: true });

      // Fetch price quote from oracle for active feed in modal
      const eth = new Eth(window.ethereum);
      const feedContract = new eth.Contract(config.dev[feed.feedABIType], feed.feedAddress);
      const price = await feedContract.methods.getData().call();

      // Store price value in feeds and feed of state
      feeds[feed.symbol].price = feed.price = price
      this.setState({ feeds, feed, loadingPrice: false });
    } catch (err) {
      console.error(err);
      this.setState({ loadingPrice: false });
      //alert('Not able to get quote at this time');
    }
  }

  executeTrade = async () => {
    const { feed, feeds, account, amount, side, leverage } = this.state;

    try {
      if (!amount) {
        throw new Error('Amount of OVL is required');
      } else if (!feed.price) {
        throw new Error('Need price quote from oracle');
      }

      // Mark as loading
      this.setState({ loadingTrade: true });

      // Submit trade to update position
      // { account, symbol, amount, price }
      const { positions, balance, total } = (
        await firebase.functions().httpsCallable('updatePosition')({
          account,
          amount: parseFloat(amount) * side,
          price: parseFloat(feed.price),
          symbol: feed.symbol,
        })
      ).data;

      // Clear out the oracle price
      feeds[feed.symbol].price = feed.price = '';

      // Update state based on position, balances updates
      this.setState({ positions, balance, total, feeds, amount: '', loadingTrade: false });

      // Update the returns data
      this.initializeReturns();

      // Close the modal
      this.handleClose();
    } catch (err) {
      console.error(err);
      this.setState({ loadingTrade: false });
      alert(`Error executing trade: ${err.message}`);
    }
  }

  applyBaseFactor(amount, decimals) {
    const base = Math.pow(10, decimals);
    return amount * base;
  }

  removeBaseFactor(amount, decimals) {
    const base = Math.pow(10, decimals);
    return amount / base;
  }

  renderBalance() {
    const { balance, loadingFunds } = this.state;
    if (balance) {
      return (
        <small className="text-right px-2">
          <strong>Unlocked {Numeral(balance.unlocked).format('0,0.000')} OVL</strong>
          <div>Locked {Numeral(balance.locked).format('0,0.000')} OVL</div>
        </small>
      );
    } else {
      if (loadingFunds) {
        return (
          <Button
            variant="primary"
            className="mx-2"
            size="sm"
            type="button"
          >
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />
            <span className="sr-only">Loading...</span>
          </Button>
        );
      } else {
        return (
          <Button
            variant="primary"
            className="mx-2"
            size="sm"
            type="button"
            onClick={this.addFunds}
          >
            Add Funds
          </Button>
        );
      }
    }
  }

  renderTotalNav() {
    const { total } = this.state;
    return (
      <Navbar bg="light" className="justify-content-center border-bottom">
        <small>Total Supply: <strong>{(total.supply ? `${Numeral(this.removeBaseFactor(total.supply, total.decimals)).format('0,0.000')} OVL` : '')}</strong></small>
      </Navbar>
    );
  }

  renderAccount() {
    const { account, balance } = this.state;
    if (account) {
      return (
        <div className="d-flex align-items-center">
          {this.renderBalance()}
          <Button variant="light">
            {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
          </Button>
        </div>
      );
    } else {
      return (
        <Button variant="light" onClick={this.initializeAccount}>
          <img
            src={metaMaskSrc}
            className="d-inline-block align-top pr-2 pt-1"
            alt="MetaMask logo"
          />
          MetaMask
        </Button>
      );
    }
  }

  renderModal() {
    const { feed, balance, leverage } = this.state;
    return (
      <Modal id="trade-modal" size="lg" show={this.state.show} onHide={this.handleClose}>
        <Modal.Header closeButton>
          <strong>Trade {feed.name}</strong>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <TradingViewWidget
              symbols={[feed.chartSymbol]}
              width='100%'
              height='150'
              widgetType='MiniWidget'
            />
            <Form.Label className="mt-3">Price</Form.Label>
            {this.renderPriceInModal()}
            <Form.Label>Side</Form.Label>
            <ButtonToolbar className="mb-3">
              <ToggleButtonGroup
                type="radio"
                name="side"
                defaultValue={1}
                onChange={(val, e) => this.setState({ side: val })}
              >
                <ToggleButton variant="light" value={1}>Long</ToggleButton>
                <ToggleButton variant="light" value={-1}>Short</ToggleButton>
              </ToggleButtonGroup>
            </ButtonToolbar>
            <Form.Label>Amount</Form.Label>
            <InputGroup className="mb-3">
              <FormControl
                id="trade-amount"
                type="number"
                placeholder="0.000"
                step="0.001"
                aria-label="Amount"
                aria-describedby="btnGroupAddon"
                onChange={(e) => this.setState({ amount: e.target.value })}
              />
              <InputGroup.Append>
                <InputGroup.Text id="btnGroupAddon">OVL</InputGroup.Text>
              </InputGroup.Append>
            </InputGroup>
            <Form.Label>Leverage: {leverage}x</Form.Label>
            <InputGroup>
              <Form.Control
                id="trade-leverage"
                type="range"
                aria-label="Leverage"
                min={1}
                max={10}
                value={leverage}
                step={0.05}
                onChange={(e) => this.setState({ leverage: e.target.value })}
              />
            </InputGroup>
          </Form>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between align-items-start">
          <div className="d-flex flex-column">
            <small>Fee: <strong>0.15%</strong></small>
            <small>Max payout: <strong>1% of total supply</strong></small>
          </div>
          {this.renderModalButton()}
        </Modal.Footer>
      </Modal>
    );
  }

  renderPositionInModal() {
    const { positions, feed } = this.state;
    const symbol = feed.symbol;
    if (positions && symbol in positions) {
      const position = positions[symbol];

      var sign;
      switch (Math.sign(position.amount)) {
        case 1:
          sign = '+';
          break;
        case -1:
          sign = '-';
          break;
        default:
          sign = '';
      }

      return (
        <small className="d-flex justify-content-start mb-2">
          <div>Locked: <strong>{`${sign}${Numeral(Math.abs(position.amount)).format('0,0.000')}`} OVL</strong></div>
          <small className="px-2">&middot;</small>
          <div>Avg Price: <strong>{(position.averagePrice ? `${Numeral(position.averagePrice).format('0,0.000')} ${feed.denom}` : '-')}</strong></div>
        </small>
      );
    } else {
      return (
        <small className="d-flex justify-content-start mb-2">
          <div>Locked: <strong>0.000 OVL</strong></div>
          <small className="px-2">&middot;</small>
          <div>Avg Price: <strong>-</strong></div>
        </small>
      );
    }
  }

  renderPriceInModal() {
    const { balance, feed, loadingPrice } = this.state;
    if (loadingPrice) {
      return (
        <InputGroup className="mb-3">
          <Button variant="primary">
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />
            <span className="sr-only">Loading...</span>
          </Button>
        </InputGroup>
      );
    } else if (feed.price === '' && balance) {
      return (
        <InputGroup className="mb-3">
          <Button variant="primary" type="button" onClick={this.getQuote}>Get Quote From Oracle</Button>
        </InputGroup>
      );
    } else if (feed.price === '' && !balance) {
      return (
        <InputGroup className="mb-3">
          <Button variant="primary" type="button" disabled>Get Quote From Oracle</Button>
        </InputGroup>
      );
    } else {
      return (
        <InputGroup className="mb-3">
          <div className="d-flex align-items-center">
            <span className="h4">{this.removeBaseFactor(feed.price, feed.decimals)} {feed.denom}</span>
            <Button className="ml-2" variant="link" size="sm" onClick={this.getQuote}>
              <FontAwesomeIcon icon="sync" />
            </Button>
          </div>
        </InputGroup>
      );
    }
  }

  renderModalButton() {
    const { balance, feed, loadingTrade } = this.state;
    if (balance && feed.price) {
      if (loadingTrade) {
        return (
          <Button variant="primary" type="button">
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />
            <span className="sr-only">Loading...</span>
          </Button>
        );
      } else {
        return (
          <Button variant="primary" type="button" onClick={this.executeTrade}>
            Submit
          </Button>
        );
      }
    } else {
      return (
        <Button variant="primary" type="button" disabled>
          Submit
        </Button>
      );
    }
  }

  renderSelectFeed() {
    const { feeds, feed } = this.state;
    return (
      <Form.Control as="select" className="my-2" defaultValue={feed.symbol} onChange={this.handleFeedChange}>
      {
        Object.keys(feeds).map(symbol => {
          const feed = feeds[symbol];
          return (<option value={symbol}>{symbol}</option>);
      })}
      </Form.Control>
    );
  }

  renderPriceInFeed() {
    const { feed, loadingPrice } = this.state;
    if (loadingPrice) {
      return (
        <Spinner
          as="span"
          animation="border"
          size="sm"
          role="status"
          aria-hidden="true"
        />
      );
    } else if (feed.price !== '') {
      return (<div>{this.removeBaseFactor(feed.price, feed.decimals)} {feed.denom} <small className="text-muted">(Last Oracle Price)</small><Button className="ml-1" variant="link" size="sm" onClick={this.getQuote}><FontAwesomeIcon icon="sync" /></Button></div>);
    } else {
      return (<></>);
    }
  }

  renderFeed() {
    const { feed } = this.state;
    return (
      <Card>
        <Card.Body>
          <Card.Title className="d-flex justify-content-between align-items-start">
            <div>{feed.name}</div>
            {this.renderPriceInFeed()}
          </Card.Title>
          <Card.Text>
            <TradingViewWidget
              symbol={feed.chartSymbol}
              style={BarStyles.AREA}
              width='100%'
              height='325'
              allow_symbol_change={false}
              show_popup_button
            />
          </Card.Text>
          {this.renderPositionInFeed(feed.symbol)}
        </Card.Body>
      </Card>
    );
  }

  renderPositionInFeed() {
    const { positions, feed, balance } = this.state;
    const symbol = feed.symbol;
    if (positions && symbol in positions) {
      const position = positions[symbol];
      return (
        <div className="d-flex justify-content-between align-items-center">
          <small>
            <strong>Your Current Positions</strong>
            <div>Locked: <strong>{(Math.abs(position.amount) > 0.0 ? (Math.sign(position.amount) === 1 ? 'Long ' : 'Short ') : ' ')}{Numeral(Math.abs(position.amount)).format('0,00.000')} OVL</strong></div>
            <div>Avg Price: <strong>{(position.averagePrice ? `${Numeral(position.averagePrice).format('0,0.000')} ${feed.denom}` : '-')}</strong></div>
          </small>
          <Button variant="primary" size="md" onClick={this.handleShow}>Trade</Button>
        </div>
      );
    } else {
      // TODO: else if (balance)
      return (
        <div className="d-flex justify-content-between align-items-center">
          <small>
            <strong>Your Current Positions</strong>
            <div>Locked: <strong>{(balance ? '0.000 OVL' : '-')}</strong></div>
            <div>Avg Price: <strong>-</strong></div>
          </small>
          <Button variant="primary" size="md" onClick={this.handleShow}>Trade</Button>
        </div>
      );
    }
  }

  render() {
    return (
      <Container>
        <div className="fixed-top">
          {this.renderTotalNav()}
          <Navbar bg="light" variant="light" className="justify-content-between border-bottom">
            <Navbar.Brand>
              <img
                src={bannerSrc}
                height="35"
                className="d-inline-block align-top"
                alt="React Bootstrap logo"
              />
            </Navbar.Brand>
            {this.renderAccount()}
          </Navbar>
        </div>
        {this.renderModal()}
        <Container className="App">
          {this.renderSelectFeed()}
          {this.renderFeed()}
        </Container>
      </Container>
    );
  }

  initializeMetaMask = async () => {
    // Fetch ethereum accounts from MetaMask
    if (typeof window.ethereum === undefined) {
      alert('MetaMask not supported by this browser');
      return;
    }

    try {
      const ethereum = window.ethereum,
        accounts = await ethereum.enable(),
        account = accounts[0];

      // Check whether conditions met to trade w account
      if (ethereum.networkVersion !== '4') {
        alert('This application only works on Rinkeby Test Network ... for now');
        return;
      } else if (!account) {
        alert('Create a MetaMask account to trade');
        return;
      }
      // Store the account
      this.setState({ account });
    } catch (error) {
      console.error(error);
    }
  }

  initializeBalance = async () => {
    // From firebase (but eventually from smart contract)
    // Balance { locked, unlocked }
    const { account } = this.state;
    try {
      var balance = (await firebase.firestore().collection("balances").doc(account).get()).data();
      if (!balance) {
        balance = null;
      }
      this.setState({ balance });
    } catch (error) {
      console.error(error);
    }
  }

  initializePositions = async () => {
    // From firebase (but eventually from smart contract)
    // Positions { symbol: { amount, avg_price } }
    const { account } = this.state;
    try {
      const positions = (await firebase.firestore().collection("positions").doc(account).get()).data();
      this.setState({ positions });
    } catch (error) {
      console.error(error);
    }
  }

  initializeReturns = () => {
    const { balance, positions, feeds } = this.state;

    if (positions) {
      // Calculate returns, gains for each given price data
      var balanceGain = 0.0; // NOTE: use for locked paper gains/losses
      Object.keys(positions).forEach(symbol => {
        const position = positions[symbol],
          feed = feeds[symbol],
          ret = (feed && feed.lastPrice && position.averagePrice ? Math.max(Math.sign(position.amount) * ((parseFloat(feed.lastPrice) - parseFloat(position.averagePrice)) / parseFloat(position.averagePrice)), -1.00) : 0.0),
          gain = Math.abs(position.amount) * ret;

        position.ret = ret;
        position.gain = gain;

        balanceGain += gain;
      });

      // Calculate total paper gains/return for locked balance funds
      // NOTE: Math.max(, -1.0) because can't lose more than what you've locked up
      const balanceRet = Math.max(balanceGain / balance.locked, -1.0);
      balance.ret = balanceRet;
      balance.gain = balanceGain;
    }

    this.setState({ balance, positions });
  }

  initializeTotalStats = async () => {
    const { tokenAddress, account } = this.state;
    // TODO: make sure have eth context
    // SEE: https://github.com/iearn-finance/iearn-finance/blob/y/src/stores/store.jsx#L1273
    // TODO: https://web3js.readthedocs.io/en/v1.3.0/getting-started.html
    const eth = new Eth(window.ethereum);
    const tokenContract = new eth.Contract(config.dev.ovlTokenABI, tokenAddress);

    const supply = await tokenContract.methods.totalSupply().call();
    const decimals = await tokenContract.methods.decimals().call();
    const total = { supply, decimals };
    this.setState({ total });
  }

  // Initializes the current feed ...
  initializeFeed = async () => {
    const { feed, feeds } = this.state;
    await this.getQuote();

    // TODO: Set up listeners
    //switch (feed.feedABIType) {
    //  case 'ovlChainlinkFeedABI':
    //    break;
    //  default:
    //    console.log('feed type not supported for listeners');
    //}
  }

  initializeFeeds = async () => {
    const { feeds } = this.state,
      feedSnapshot = (await firebase.firestore().collection("feeds").get());

    // Get all of the feeds to extract last updated prices
    feedSnapshot.forEach(doc => {
      const { symbol, price } = doc.data(),
        feed = feeds[symbol];

      if (feed) {
        feed.lastPrice = price;
      }
    });

    // Update the state with new feeds list
    this.setState({ feeds });
  }

  initializeAccount = async () => {
    await this.initializeMetaMask();
    await this.initializeBalance();
    await this.initializePositions();
    this.initializeReturns();
  }

  initializeMetaMaskListeners = () => {
    if (window.ethereum && typeof window.ethereum !== undefined) {
      window.ethereum.on('accountsChanged', async (accounts) => {
        var account = accounts[0];
        if (!account) {
          account = null;
        }
        // Set account state and reset balance, positions state
        this.setState({ account, balance: null, positions: null });
        await this.initializeBalance();
        await this.initializePositions();
      });
    }
  }

  initializeListeners = () => {
    this.initializeMetaMaskListeners();
    // TODO: add token.mint/burn listeners ... for supply changes
  }

  componentDidMount = async () => {
    // Initialize Firebase
    firebase.initializeApp(constants.firebase.config);

    // TODO: Initialize web3 provider

    // Initialize total metrics: circulating supply, reserve supply of OVL, etc.
    await this.initializeTotalStats();

    // Initialize feeds: get last prices
    // await this.initializeFeeds();
    await this.initializeFeed();

    // Initialize listeners for event changes
    this.initializeListeners();
  }
}

export default App;
