const main = document.querySelector("#main");
const buttons = document.querySelectorAll("#buttons button");
const newGameButton = buttons[0];
const rules = buttons[1];
const nameButton = buttons[2];
const greeting = document.querySelector("#greeting");


if (localStorage.getItem("playerName") == null){
    greeting.textContent="Üdv, Játékos!";
}
else{
    greeting.textContent=`Üdv, ${localStorage.getItem("playerName")}`;
}

nameButton.addEventListener("click", () => {
    const overlay = document.createElement("div");
    overlay.classList.add("overlay");

    const overlayContent = document.createElement("div");
    overlayContent.classList.add("overlay-content");

    const title = document.createElement("h2");
    title.textContent = "Add meg a neved:";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "pl. MetroSlayer";

    const button = document.createElement("button");
    button.textContent = "Mentés";

    overlayContent.appendChild(title);
    overlayContent.appendChild(input);
    overlayContent.appendChild(button);

    overlay.appendChild(overlayContent);

    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add("show"));

    input.focus();

    const saveName = () => {
        if (input.value.trim() == null || input.value.trim() == ""){
            if (!overlayContent.querySelector(".error-message")){
                const errorMsg = document.createElement("div");
                errorMsg.classList.add("error-message");
                errorMsg.textContent = "Nem adtál meg nevet!";
                overlayContent.appendChild(errorMsg);

                setTimeout(() => {
                    errorMsg.classList.add("fade-out");
                    errorMsg.addEventListener("transitionend", () => errorMsg.remove());
                }, 2000);
            }
            return;
        }
        else{
            greeting.textContent = `Üdv, ${input.value}!`;
            localStorage.setItem("playerName", input.value);
            overlay.classList.remove("show");
            overlay.addEventListener("transitionend", e => {
                if (e.propertyName === "opacity" && !overlay.classList.contains("show")) {
                    overlay.remove();
                }
            });
        }
    }

    button.addEventListener("click", saveName);
    input.addEventListener("keypress", (e) =>{
        if (e.key === "Enter"){
            saveName();
        }
    })

    overlay.addEventListener("click", e => {
        if (e.target === overlay) {
            overlay.classList.remove("show");
            overlay.addEventListener("transitionend", e2 => {
                if (e2.propertyName === "opacity" && !overlay.classList.contains("show")) {
                    overlay.remove();
                }
            });
        }
    });
});

newGameButton.addEventListener("click", () => {
    window.location = "./src/html/game.html";
})

rules.addEventListener("click", () =>{
    window.location = "./src/html/rules.html";
})
