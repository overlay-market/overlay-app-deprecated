import React, { Component } from 'react';
import { Alert } from 'react-bootstrap';

class AlertDismissible extends Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      show: true,
    };
  }

  render = () => {
    const { show } = this.state;

    if (!show) {
      return (<></>);
    }

    return (
      <Alert variant={this.props.variant} onClose={() => this.setState({ show: false })} dismissible>
        <Alert.Heading><small>{this.props.header}</small></Alert.Heading>
        <p>
          {this.props.body}
        </p>
      </Alert>
    )
  }
}

export default AlertDismissible;
