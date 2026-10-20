use crate::grid::{Grid, GridTrait, State};

mod grid;
fn main() {
    let mut grid = Grid::new();

    println!("--- Estado Inicial ---");
    println!("{grid:?}");

    // Fazemos 7 tentativas na coluna 0 para ver os Ok(row) e o Err(...)
    for i in 1..=7 {
        let result = grid.insert(State::Yellow, 0);
        println!("Tentativa {i} -> Retorno do insert: {:?}", result);
        println!("{grid:?}");
    }
}
