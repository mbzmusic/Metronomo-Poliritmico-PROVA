/* ==========================================================================
   script.js - Modifica Singolo Click su Numero Beat per Menu Suddivisioni
   ========================================================================== */

// 1. Gestione del Singolo Click sul numero del beat
// Sostituisci o aggiorna l'evento touchstart/mousedown/long-press originale con questo:

function bindBeatClick(beatNumEl, measureIndex, beatIndex) {
    beatNumEl.addEventListener('click', (e) => {
        e.stopPropagation(); // Impedisce la chiusura immediata se c'è un listener globale
        
        // Se il menu è già aperto su questo beat, lo chiude, altrimenti lo apre
        if (typeof activeSubPopupTrigger !== 'undefined' && activeSubPopupTrigger === beatNumEl) {
            if (typeof closeSubPopup === 'function') closeSubPopup();
        } else {
            if (typeof openSubPopup === 'function') openSubPopup(beatNumEl, measureIndex, beatIndex);
        }
    });
}

// 2. Listener globale sul documento per chiudere il popup se si clicca all'esterno
document.addEventListener('click', (e) => {
    const subPopupElement = document.querySelector('.subdivision-popup');
    if (subPopupElement && !subPopupElement.contains(e.target)) {
        if (typeof closeSubPopup === 'function') {
            closeSubPopup();
        }
    }
});
