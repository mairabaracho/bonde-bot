import gql from 'graphql-tag'

export default gql`
query fetchBotLastInteraction($recipientId: String!) {
  fetchBotLastInteraction: allFacebookBotInteractions(
    condition: {
      fbContextRecipientId: $recipientId
    }
    last: 1
    orderBy: ID_ASC
  ) {
    interactions: nodes {
      id
      activistId
      facebookBotConfigurationId
      fbContextRecipientId
      fbContextSenderId
      interaction
      createdAt
      updatedAt
    }
  }
}
`
