describe('Admin functionality', function() {
    beforeEach(function() {
        cy.visit('http://localhost:3000');
        cy.get('#registration-name-input').type('admin')
        cy.get('#registration-password-input').type('password')
        cy.get('#popup').contains('Kirjaudu').click(50)
        cy.wait(1000)
        cy.get('#admin-view-button').contains('Vaihda näkymää').click().wait(500)
    })

    it('Attempting to show students', function() {
        cy.get('.user-list .user-item').should('have.length.greaterThan', 1)
    })

    it('Attempting to show student files (FINNISH)', function() {
        cy.contains('.user-item', 'Alice').within(() => {
            cy.get('.user-action-button:contains("Näytä tiedostot")').click()
          })
        cy.get('#user-files-section').should('be.visible')
        cy.get('#user-files-section').should('have.length.greaterThan', 0)
    })

    it('Attempting to show student info (FINNISH)', function() {
        cy.contains('.user-item', 'Alice').within(() => {
            cy.get('.user-action-button:contains("Näytä käyttäjän tiedot")').click()
          })
        cy.get('.user-info').should('be.visible')
        cy.get('.user-info p:contains("Käyttäjä:")').should('contain', 'Alice')
        cy.get('#change-password-button').should('be.visible')
    })

    it('Attempting to show student files (ENGLISH)', function() {
        cy.get('.navbar').contains('Switch to English').click()
        cy.contains('.user-item', 'Alice').within(() => {
            cy.get('.user-action-button:contains("Show Files")').click()
          })
        cy.get('#user-files-section').should('be.visible')
        cy.get('#user-files-section').should('have.length.greaterThan', 0)
    })

    it('Attempting to show student info (ENGLISH)', function() {
        cy.get('.navbar').contains('Switch to English').click()
        cy.contains('.user-item', 'Alice').within(() => {
            cy.get('.user-action-button:contains("Show User Info")').click()
          })
        cy.get('.user-info').should('be.visible')
        cy.get('.user-info p:contains("Username:")').should('contain', 'Alice')
        cy.get('#change-password-button').should('be.visible')
    })

    it('Attempting to open a file', function() {
        cy.get('#all-files-section').first().as('firstFileRow')
        cy.get('@firstFileRow').contains('Avaa').click({ force: true })
        cy.get('#editor').should('not.contain', 'Logo...')
    })

    it('Attempting to hide and and restore a file (FINNISH)', function() {
        cy.get('#all-files-section tbody tr').first().as('firstFileRow')
        cy.get('@firstFileRow').contains('Palauta').click({ force: true })
        cy.get('@firstFileRow').should('have.css', 'background-color', 'rgb(119, 221, 119)')
        cy.get('@firstFileRow').contains('Piilota').click({ force: true })
        cy.get('@firstFileRow').should('have.css', 'background-color', 'rgb(255, 112, 112)')
    })

    it('Attempting to hide and and restore a file (ENGLISH)', function() {
        cy.get('#navbar').contains('Switch to English').click()
        cy.get('#all-files-section tbody tr').first().as('firstFileRow')
        cy.get('@firstFileRow').contains('Restore').click({ force: true })
        cy.get('@firstFileRow').should('have.css', 'background-color', 'rgb(119, 221, 119)')
        cy.get('@firstFileRow').contains('Hide').click({ force: true })
        cy.get('@firstFileRow').should('have.css', 'background-color', 'rgb(255, 112, 112)')
    })

    it('Turning off password requirement', function() {
        cy.get('#admin-view').contains('POIS').click(500)
        cy.get('#navbar').contains('Vaihda näkymää').click(500)
        cy.get('#navbar').contains('Kirjaudu ulos').click(500)
        cy.get('#navbar').contains('Kirjaudu sisään').click(500)
        cy.get('#registration-name-input').type('jaakko')
        cy.get('#popup').contains('Kirjaudu').click(500)
        cy.get('#navbar').should('contain', 'jaakko')
    })

    it('Turning on password requirement', function() {
        cy.get('#admin-view').contains('PÄÄLLE').click(500)
        cy.get('#navbar').contains('Vaihda näkymää').click(500)
        cy.get('#navbar').contains('Kirjaudu ulos').click(500)
        cy.get('#navbar').contains('Kirjaudu sisään').click(500)
        cy.get('#popup').should('not.contain', 'salasana')
    })
})