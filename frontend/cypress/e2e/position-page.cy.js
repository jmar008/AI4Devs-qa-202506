describe('Página de Posiciones - Pruebas E2E', () => {
  beforeEach(() => {
    // Limpiar cookies y localStorage si hay autenticación
    cy.clearCookies()
    cy.clearLocalStorage()

    // Visitar la página de posiciones (asumiendo ID 1)
    cy.visit('/positions/1')

    // Esperar a que la página cargue completamente
    cy.wait(2000)
  })

  it('Escenario 1: Carga de la Página de Position', () => {
    // Verificar que el título de la posición se muestra correctamente
    cy.get('.position-title').should('contain', 'Desarrollador Full-Stack')

    // Verificar que se muestran las columnas correspondientes a cada fase del proceso de contratación
    cy.get('.phase-column').should('have.length.at.least', 3)

    // Verificar que las columnas tienen los nombres correctos (ej. "Aplicado", "Entrevista", "Oferta")
    cy.get('.phase-column').eq(0).should('contain', 'Aplicado')
    cy.get('.phase-column').eq(1).should('contain', 'Entrevista')
    cy.get('.phase-column').eq(2).should('contain', 'Oferta')

    // Verificar que las tarjetas de los candidatos se muestran en la columna correcta según su fase actual
    // Asumiendo que hay candidatos de prueba poblados por seed.ts
    cy.get('.candidate-card').each(($card) => {
      const candidateName = $card.find('.candidate-name').text()
      // Aquí puedes agregar lógica específica basada en datos conocidos
      // Por ejemplo, si "Albert Saelices" debe estar en "Aplicado"
      if (candidateName.includes('Albert Saelices')) {
        cy.wrap($card).parents('.phase-column').should('contain', 'Aplicado')
      }
    })
  })

  it('Escenario 2: Cambio de Fase de un Candidato', () => {
    // Interceptar la petición PUT para verificar la actualización en el backend
    cy.intercept('PUT', 'http://localhost:3010/candidates/1', (req) => {
      req.reply((res) => {
        expect(res.statusCode).to.eq(200)
        expect(req.body).to.have.property('phase', 'interview')
      })
    }).as('updateCandidate')

    // Simular el arrastre de una tarjeta de candidato de una columna a otra
    // Nota: Cypress no soporta drag-and-drop nativo fácilmente, usamos triggers
    cy.get('.candidate-card[data-id="1"]').then(($card) => {
      const card = $card[0]
      const targetColumn = cy.get('.phase-column[data-phase="interview"]')[0]

      // Simular drag start
      cy.wrap(card).trigger('mousedown', { which: 1, pageX: card.offsetLeft + 10, pageY: card.offsetTop + 10 })

      // Mover a la nueva columna
      cy.wrap(targetColumn).trigger('mousemove', { pageX: targetColumn.offsetLeft + 10, pageY: targetColumn.offsetTop + 10 })

      // Soltar
      cy.wrap(targetColumn).trigger('mouseup')
    })

    // Verificar que la tarjeta del candidato se mueve a la nueva columna
    cy.get('.phase-column[data-phase="applied"]').should('not.contain', 'Albert Saelices')
    cy.get('.phase-column[data-phase="interview"]').should('contain', 'Albert Saelices')

    // Verificar que la fase del candidato se actualiza correctamente en el backend
    cy.wait('@updateCandidate')

    // Opcional: Verificar mediante GET
    cy.request('GET', 'http://localhost:3010/candidates/1').then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.phase).to.eq('interview')
    })
  })
})
